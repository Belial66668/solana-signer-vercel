// ========================================
// VERCEL - DIAGNOSTIC COMPLET TRANSACTION
// ========================================
export default async function handler(req, res) {
  console.log('🔥 === DIAGNOSTIC COMPLET ===');
  
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
    console.log('📋 Transaction base64 length:', transaction.length);
    console.log('📋 Premiers chars:', transaction.substring(0, 50) + '...');
    
    // Décoder transaction
    const transactionBuffer = Buffer.from(transaction, 'base64');
    console.log('📦 Buffer length:', transactionBuffer.length);
    
    const messageV0 = VersionedMessage.deserialize(transactionBuffer);
    const tx = new VersionedTransaction(messageV0);
    
    console.log('✅ Transaction décodée');
    
    // Analyser la structure
    console.log('\n📊 === STRUCTURE TRANSACTION ===');
    console.log('Version:', messageV0.version);
    console.log('Static Account Keys:', messageV0.staticAccountKeys.length);
    console.log('Instructions:', messageV0.compiledInstructions.length);
    console.log('Recent Blockhash:', messageV0.recentBlockhash);
    
    // Lister TOUS les comptes
    console.log('\n📋 === TOUS LES COMPTES ===');
    const staticKeys = messageV0.staticAccountKeys;
    
    for (let i = 0; i < staticKeys.length; i++) {
      const address = staticKeys[i].toString();
      const isSigner = tx.message.isAccountSigner(i);
      const isWritable = tx.message.isAccountWritable(i);
      
      console.log(`Compte ${i}: ${address}`);
      console.log(`  - Signer: ${isSigner ? 'OUI' : 'NON'}`);
      console.log(`  - Writable: ${isWritable ? 'OUI' : 'NON'}`);
      console.log(`  - Mon wallet: ${address === myWallet ? '✅ OUI' : 'NON'}`);
    }
    
    // Vérifier si le wallet est dans les comptes
    const walletIndex = staticKeys.findIndex(key => key.toString() === myWallet);
    console.log('\n🔍 Mon wallet dans la transaction:');
    console.log(`  - Index: ${walletIndex}`);
    console.log(`  - Présent: ${walletIndex >= 0 ? 'OUI' : 'NON'}`);
    
    if (walletIndex >= 0) {
      console.log(`  - Est signataire: ${tx.message.isAccountSigner(walletIndex) ? 'OUI' : 'NON'}`);
      console.log(`  - Est writable: ${tx.message.isAccountWritable(walletIndex) ? 'OUI' : 'NON'}`);
    }
    
    // Analyser le header
    console.log('\n📦 === MESSAGE HEADER ===');
    console.log('Num Required Signatures:', messageV0.header.numRequiredSignatures);
    console.log('Num Readonly Signed:', messageV0.header.numReadonlySignedAccounts);
    console.log('Num Readonly Unsigned:', messageV0.header.numReadonlyUnsignedAccounts);
    
    return res.status(200).json({
      diagnostic: 'COMPLETE_ANALYSIS',
      myWallet: myWallet,
      transaction: {
        version: messageV0.version,
        totalAccounts: staticKeys.length,
        totalInstructions: messageV0.compiledInstructions.length,
        recentBlockhash: messageV0.recentBlockhash
      },
      header: {
        numRequiredSignatures: messageV0.header.numRequiredSignatures,
        numReadonlySignedAccounts: messageV0.header.numReadonlySignedAccounts,
        numReadonlyUnsignedAccounts: messageV0.header.numReadonlyUnsignedAccounts
      },
      walletAnalysis: {
        isPresent: walletIndex >= 0,
        index: walletIndex,
        isSigner: walletIndex >= 0 ? tx.message.isAccountSigner(walletIndex) : false,
        isWritable: walletIndex >= 0 ? tx.message.isAccountWritable(walletIndex) : false
      },
      accounts: staticKeys.map((key, i) => ({
        index: i,
        address: key.toString(),
        isSigner: tx.message.isAccountSigner(i),
        isWritable: tx.message.isAccountWritable(i),
        isMyWallet: key.toString() === myWallet
      })),
      problem: 'Transaction structure analysis'
    });
    
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
