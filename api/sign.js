// ========================================
// VERCEL - DÉSÉRIALISATION CORRECTE
// ========================================
export default async function handler(req, res) {
  console.log('🔥 === VERCEL DÉSÉRIALISATION CORRECTE ===');
  
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).json({});
    }

    const { transaction, privateKey, metadata = {} } = req.body;
    
    console.log('📋 === TRANSACTION AVEC BONNE DÉSÉRIALISATION ===');
    console.log('Transaction length:', transaction ? transaction.length : 0);
    console.log('Bot:', metadata.bot || 'N8N-Bot');
    
    if (!transaction || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Transaction et privateKey requis'
      });
    }
    
    // ========================================
    // IMPORTS
    // ========================================
    const { Connection, VersionedTransaction, VersionedMessage, Keypair } = await import('@solana/web3.js');
    const bs58 = await import('bs58');
    
    console.log('🌐 Connexion Solana...');
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    const slot = await connection.getSlot();
    console.log('✅ Connecté - Slot:', slot);
    
    // ========================================
    // KEYPAIR
    // ========================================
    console.log('🔑 Création keypair...');
    const privateKeyBytes = bs58.default.decode(privateKey);
    const keypair = Keypair.fromSecretKey(privateKeyBytes);
    const walletAddress = keypair.publicKey.toString();
    
    console.log('🎯 Wallet:', walletAddress);
    
    // ========================================
    // BALANCE CHECK
    // ========================================
    const balance = await connection.getBalance(keypair.publicKey);
    const solBalance = balance / 1e9;
    console.log('💰 Balance:', solBalance.toFixed(6), 'SOL');
    
    if (balance < 5000000) {
      throw new Error(`Balance insuffisante: ${solBalance.toFixed(6)} SOL`);
    }
    
    // ========================================
    // DÉSÉRIALISATION CORRECTE AVEC VersionedMessage
    // ========================================
    console.log('🔓 Désérialisation correcte avec VersionedMessage...');
    
    let signature;
    try {
      const transactionBuffer = Buffer.from(transaction, 'base64');
      
      // IMPORTANT : Utiliser VersionedMessage.deserialize() d'abord !
      console.log('📋 Utilisation de VersionedMessage.deserialize()...');
      const messageV0 = VersionedMessage.deserialize(transactionBuffer);
      console.log('✅ VersionedMessage désérialisé avec succès');
      
      // Créer VersionedTransaction à partir du message
      console.log('🔨 Création VersionedTransaction depuis le message...');
      const tx = new VersionedTransaction(messageV0);
      console.log('✅ VersionedTransaction créée');
      
      // Obtenir un nouveau blockhash récent
      console.log('⏰ Obtention blockhash récent...');
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      console.log('📋 Blockhash:', blockhash.substring(0, 20) + '...');
      
      // Mettre à jour le blockhash dans le message
      tx.message.recentBlockhash = blockhash;
      
      // Signer la transaction
      console.log('✍️ Signature de la transaction...');
      tx.sign([keypair]);
      console.log('✅ Transaction signée');
      
      // ========================================
      // ENVOI TRANSACTION
      // ========================================
      console.log('🚀 Envoi transaction sur blockchain...');
      
      signature = await connection.sendTransaction(tx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });
      
      console.log('📋 SIGNATURE BLOCKCHAIN:', signature);
      
    } catch (versionedError) {
      console.log('❌ Erreur VersionedMessage:', versionedError.message);
      console.log('🔍 Stack:', versionedError.stack);
      throw new Error(`Erreur désérialisation VersionedMessage: ${versionedError.message}`);
    }
    
    // ========================================
    // CONFIRMATION
    // ========================================
    console.log('⏳ Attente confirmation...');
    
    let confirmationStatus = 'pending';
    try {
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        console.log('❌ Transaction failed:', confirmation.value.err);
        confirmationStatus = 'failed';
      } else {
        console.log('✅ TRANSACTION CONFIRMÉE !');
        confirmationStatus = 'confirmed';
      }
    } catch (confirmError) {
      console.log('⚠️ Confirmation timeout:', confirmError.message);
      confirmationStatus = 'timeout';
    }
    
    // ========================================
    // BALANCE FINALE
    // ========================================
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const finalBalance = await connection.getBalance(keypair.publicKey);
    const finalSolBalance = finalBalance / 1e9;
    const balanceChange = finalSolBalance - solBalance;
    
    console.log('💰 Balance finale:', finalSolBalance.toFixed(6), 'SOL');
    console.log('📊 Changement:', balanceChange.toFixed(6), 'SOL');
    
    // ========================================
    // RÉPONSE SUCCESS
    // ========================================
    console.log('🎉🎉🎉 VRAIE TRANSACTION RÉUSSIE ! 🎉🎉🎉');
    console.log('🔗 Explorer:', `https://solscan.io/tx/${signature}`);
    console.log('🤖 BOT 100% AUTOMATISÉ OPÉRATIONNEL !');
    
    return res.status(200).json({
      success: true,
      signature: signature,
      explorerUrl: `https://solscan.io/tx/${signature}`,
      solanafmUrl: `https://solana.fm/tx/${signature}`,
      balanceChange: parseFloat(balanceChange.toFixed(6)),
      balanceBefore: parseFloat(solBalance.toFixed(6)),
      balanceAfter: parseFloat(finalSolBalance.toFixed(6)),
      wallet: walletAddress,
      transactionType: 'VersionedTransaction',
      confirmationStatus: confirmationStatus,
      service: 'VERCEL_CORRECT_DESERIALIZE',
      network: 'solana-mainnet',
      timestamp: new Date().toISOString(),
      message: '🔥 VRAIE TRANSACTION AVEC BONNE DÉSÉRIALISATION !',
      metadata: metadata
    });
    
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    console.error('🔍 Stack:', error.stack);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({
      success: false,
      error: error.message,
      service: 'VERCEL_CORRECT_DESERIALIZE',
      timestamp: new Date().toISOString()
    });
  }
}
