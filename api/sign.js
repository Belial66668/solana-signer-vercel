// ========================================
// VERCEL FINAL - VRAIES TRANSACTIONS SOLANA
// ========================================
export default async function handler(req, res) {
  console.log('🔥 === VERCEL FINAL - VRAIES TRANSACTIONS ===');
  
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).json({});
    }

    const { transaction, privateKey, metadata = {} } = req.body;
    
    console.log('📋 === VRAIE TRANSACTION FINALE ===');
    console.log('Transaction length:', transaction ? transaction.length : 0);
    console.log('Bot:', metadata.bot || 'N8N-Bot');
    console.log('Timestamp:', metadata.timestamp);
    
    if (!transaction || !privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Transaction et privateKey requis'
      });
    }
    
    // ========================================
    // IMPORTS ET CONNEXION
    // ========================================
    const { Connection, VersionedTransaction, Transaction, Keypair } = await import('@solana/web3.js');
    const bs58 = await import('bs58');
    
    console.log('🌐 Connexion Solana...');
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    const slot = await connection.getSlot();
    console.log('✅ Connecté - Slot:', slot);
    
    // ========================================
    // CRÉATION KEYPAIR
    // ========================================
    console.log('🔑 Création keypair...');
    const privateKeyBytes = bs58.default.decode(privateKey);
    const keypair = Keypair.fromSecretKey(privateKeyBytes);
    const walletAddress = keypair.publicKey.toString();
    
    console.log('🎯 Wallet:', walletAddress);
    
    // ========================================
    // VÉRIFICATION BALANCE
    // ========================================
    const balance = await connection.getBalance(keypair.publicKey);
    const solBalance = balance / 1e9;
    console.log('💰 Balance:', solBalance.toFixed(6), 'SOL');
    
    if (balance < 5000000) {
      throw new Error(`Balance insuffisante: ${solBalance.toFixed(6)} SOL`);
    }
    
    // ========================================
    // DÉCODAGE ET SIGNATURE TRANSACTION
    // ========================================
    console.log('🔓 Décodage transaction Jupiter...');
    
    const transactionBuffer = Buffer.from(transaction, 'base64');
    let tx;
    let signature;
    
    try {
      // Essayer VersionedTransaction d'abord (Jupiter moderne)
      tx = VersionedTransaction.deserialize(transactionBuffer);
      console.log('✅ VersionedTransaction décodée');
      
      // Signature VersionedTransaction
      console.log('✍️ Signature VersionedTransaction...');
      tx.sign([keypair]);
      
      console.log('🚀 Envoi VersionedTransaction...');
      signature = await connection.sendTransaction(tx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });
      
    } catch (versionedError) {
      console.log('⚠️ VersionedTransaction failed:', versionedError.message);
      
      try {
        // Fallback vers Legacy Transaction
        tx = Transaction.from(transactionBuffer);
        console.log('✅ Legacy Transaction décodée');
        
        // Préparation Legacy
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        tx.feePayer = keypair.publicKey;
        
        // Signature Legacy
        console.log('✍️ Signature Legacy Transaction...');
        tx.sign(keypair);
        
        console.log('🚀 Envoi Legacy Transaction...');
        signature = await connection.sendRawTransaction(tx.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3
        });
        
      } catch (legacyError) {
        throw new Error(`Transaction format error - Versioned: ${versionedError.message}, Legacy: ${legacyError.message}`);
      }
    }
    
    console.log('📋 SIGNATURE BLOCKCHAIN:', signature);
    
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
    // RÉPONSE FINALE SUCCESS
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
      transactionType: tx instanceof VersionedTransaction ? 'VersionedTransaction' : 'LegacyTransaction',
      confirmationStatus: confirmationStatus,
      processingTime: Date.now() - new Date(metadata.timestamp || Date.now()).getTime(),
      service: 'VERCEL_FINAL_PRODUCTION',
      network: 'solana-mainnet',
      timestamp: new Date().toISOString(),
      message: '🔥 VRAIE TRANSACTION BLOCKCHAIN AUTOMATIQUE RÉUSSIE !',
      automation: '100% - Détection N8N + Signature Vercel + Blockchain Solana',
      metadata: metadata
    });
    
  } catch (error) {
    console.error('❌ ERREUR FINALE:', error.message);
    console.error('🔍 Stack:', error.stack);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({
      success: false,
      error: error.message,
      service: 'VERCEL_FINAL_PRODUCTION',
      timestamp: new Date().toISOString(),
      errorDetails: {
        type: error.constructor.name,
        message: error.message
      }
    });
  }
}
