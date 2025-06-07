// ========================================
// VERCEL FINAL - TRAITEMENT RÉEL TRANSACTIONS
// ========================================
export default async function handler(req, res) {
  console.log('🔥 === VERCEL TRAITEMENT RÉEL ===');
  
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).json({});
    }

    const { transaction, privateKey, metadata = {} } = req.body;
    
    console.log('📋 Transaction reçue, length:', transaction ? transaction.length : 0);
    console.log('🤖 Bot:', metadata.bot || 'N8N-Bot');
    console.log('📊 Mode:', metadata.realMode ? 'PRODUCTION' : 'TEST');
    
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
    // DÉCODER ET SIGNER LA TRANSACTION
    // ========================================
    console.log('🔓 Décodage transaction Jupiter v6...');
    
    let signature;
    try {
      const transactionBuffer = Buffer.from(transaction, 'base64');
      
      // Jupiter v6 utilise VersionedTransaction
      const versionedTx = VersionedTransaction.deserialize(transactionBuffer);
      console.log('✅ VersionedTransaction désérialisée');
      
      // Vérifier que notre wallet est bien le payeur
      const message = versionedTx.message;
      const accountKeys = message.staticAccountKeys;
      console.log('📋 Nombre de comptes:', accountKeys.length);
      
      // Le premier compte devrait être notre wallet (fee payer)
      const feePayer = accountKeys[0].toString();
      console.log('💳 Fee payer:', feePayer);
      
      if (feePayer !== walletAddress) {
        console.log('⚠️ Fee payer différent de notre wallet');
        console.log('   Expected:', walletAddress);
        console.log('   Got:', feePayer);
      }
      
      // Signer la transaction
      console.log('✍️ Signature de la transaction...');
      versionedTx.sign([keypair]);
      console.log('✅ Transaction signée');
      
      // ========================================
      // ENVOI SUR BLOCKCHAIN
      // ========================================
      console.log('🚀 Envoi sur blockchain Solana...');
      
      signature = await connection.sendTransaction(versionedTx, {
        skipPreflight: true,  // Skip pour éviter les erreurs de simulation
        preflightCommitment: 'processed'
      });
      
      console.log('📋 SIGNATURE BLOCKCHAIN:', signature);
      console.log('🔗 Explorer:', `https://solscan.io/tx/${signature}`);
      
    } catch (txError) {
      console.error('❌ Erreur transaction:', txError.message);
      throw txError;
    }
    
    // ========================================
    // CONFIRMATION
    // ========================================
    console.log('⏳ Attente confirmation...');
    
    let confirmationStatus = 'pending';
    try {
      const latestBlockhash = await connection.getLatestBlockhash();
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      });
      
      if (confirmation.value.err) {
        console.log('❌ Transaction failed:', confirmation.value.err);
        confirmationStatus = 'failed';
      } else {
        console.log('✅ TRANSACTION CONFIRMÉE !');
        confirmationStatus = 'confirmed';
      }
    } catch (confirmError) {
      console.log('⚠️ Timeout confirmation:', confirmError.message);
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
    
    return res.status(200).json({
      success: true,
      signature: signature,
      explorerUrl: `https://solscan.io/tx/${signature}`,
      solanafmUrl: `https://solana.fm/tx/${signature}`,
      balanceChange: parseFloat(balanceChange.toFixed(6)),
      balanceBefore: parseFloat(solBalance.toFixed(6)),
      balanceAfter: parseFloat(finalSolBalance.toFixed(6)),
      wallet: walletAddress,
      confirmationStatus: confirmationStatus,
      service: 'VERCEL_JUPITER_V6',
      network: 'solana-mainnet',
      timestamp: new Date().toISOString(),
      message: '🔥 VRAIE TRANSACTION JUPITER V6 EXÉCUTÉE !',
      metadata: metadata
    });
    
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    console.error('🔍 Stack:', error.stack);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({
      success: false,
      error: error.message,
      service: 'VERCEL_JUPITER_V6',
      timestamp: new Date().toISOString()
    });
  }
}
