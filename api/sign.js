// ========================================
// VERCEL - DIAGNOSTIC SIGNATAIRES SIMPLE
// ========================================
export default async function handler(req, res) {
  console.log('🔥 === DIAGNOSTIC SIGNATAIRES ===');
  
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).json({});
    }

    const { transaction, privateKey, metadata = {} } = req.body;
    
    // Imports
    const { VersionedTransaction, VersionedMessage, Keypair } = await import('@solana/web3.js');
    const bs58 = await import('bs58');
    
    // Keypair
    const privateKeyBytes = bs58.default.decode(privateKey);
    const keypair = Keypair.fromSecretKey(privateKeyBytes);
    const myWallet = keypair.publicKey.toString();
    
    console.log('🎯 Mon wallet:', myWallet);
    
    // Décoder transaction
    const transactionBuffer = Buffer.from(transaction, 'base64');
    const messageV0 = VersionedMessage.deserialize(transactionBuffer);
    const tx = new VersionedTransaction(messageV0);
    
    // Analyser signataires
    console.log('\n🔐 === SIGNATAIRES REQUIS ===');
    const staticKeys = tx.message.staticAccountKeys;
    const signers = [];
    
    for (let i = 0; i < staticKeys.length; i++) {
      if (tx.message.isAccountSigner(i)) {
        const address = staticKeys[i].toString();
        const isMyWallet = address === myWallet;
        console.log(`Signataire ${i}: ${address} ${isMyWallet ? '✅ MON WALLET' : '❌ AUTRE'}`);
        signers.push({ address, isMyWallet });
      }
    }
    
    const otherSigners = signers.filter(s => !s.isMyWallet);
    
    console.log(`\nTotal signataires: ${signers.length}`);
    console.log(`Mon wallet: ${signers.filter(s => s.isMyWallet).length}`);
    console.log(`Autres: ${otherSigners.length}`);
    
    if (otherSigners.length > 0) {
      console.log('\n❌ PROBLÈME: Transaction nécessite ces signatures:');
      otherSigners.forEach(s => console.log(`  - ${s.address}`));
    }
    
    return res.status(200).json({
      diagnostic: 'SIGNERS_ANALYSIS',
      myWallet: myWallet,
      totalSigners: signers.length,
      myWalletSigners: signers.filter(s => s.isMyWallet).length,
      otherSignersRequired: otherSigners.length,
      otherSigners: otherSigners.map(s => s.address),
      problem: otherSigners.length > 0 ? 'Transaction requires other signatures' : 'OK',
      solution: 'Need to use different Jupiter parameters or endpoint'
    });
    
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
