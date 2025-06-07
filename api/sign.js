// ========================================
// VERCEL DEBUG - VERSION ULTRA SIMPLE
// ========================================
export default async function handler(req, res) {
  console.log('🔥 === VERCEL DEBUG SIMPLE ===');
  
  try {
    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).json({});
    }

    const { transaction, privateKey, metadata = {} } = req.body;
    
    console.log('📋 === DONNÉES REÇUES ===');
    console.log('Transaction présente:', !!transaction);
    console.log('Transaction length:', transaction ? transaction.length : 0);
    console.log('Private key présente:', !!privateKey);
    console.log('Metadata:', JSON.stringify(metadata, null, 2));
    
    if (!transaction || !privateKey) {
      console.log('❌ Données manquantes');
      return res.status(400).json({
        success: false,
        error: 'Transaction et privateKey requis'
      });
    }
    
    // ========================================
    // TEST DÉCODAGE SIMPLE (SANS SIGNATURE)
    // ========================================
    console.log('🧪 Test décodage simple...');
    
    try {
      // Importer dynamiquement pour éviter les erreurs
      const { Connection } = await import('@solana/web3.js');
      
      console.log('✅ @solana/web3.js importé');
      
      // Test connexion simple
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      const slot = await connection.getSlot();
      
      console.log('✅ Connexion Solana OK, slot:', slot);
      
      // Test décodage buffer simple
      const transactionBuffer = Buffer.from(transaction, 'base64');
      console.log('✅ Buffer créé, length:', transactionBuffer.length);
      
      // Réponse de succès SANS tentative de signature
      const debugSignature = "VERCEL_DEBUG_SUCCESS_" + Date.now();
      
      console.log('🎉 Vercel traitement debug réussi');
      
      return res.status(200).json({
        success: true,
        signature: debugSignature,
        explorerUrl: `https://solscan.io/tx/${debugSignature}`,
        message: "✅ Vercel debug - Connexion et décodage OK",
        debugResults: {
          solanaConnection: "OK",
          currentSlot: slot,
          transactionBuffer: "OK",
          bufferLength: transactionBuffer.length,
          dataReceived: {
            transactionLength: transaction.length,
            hasPrivateKey: !!privateKey,
            metadata: metadata
          }
        },
        service: "VERCEL_DEBUG_SIMPLE",
        timestamp: new Date().toISOString(),
        nextStep: "Ajouter signature après validation debug"
      });
      
    } catch (solanaError) {
      console.log('❌ Erreur Solana:', solanaError.message);
      console.log('🔍 Stack:', solanaError.stack);
      
      return res.status(500).json({
        success: false,
        error: `Erreur Solana: ${solanaError.message}`,
        debugInfo: {
          errorType: solanaError.constructor.name,
          stack: solanaError.stack
        },
        service: "VERCEL_DEBUG_SIMPLE"
      });
    }
    
  } catch (error) {
    console.error('❌ ERREUR GLOBALE:', error.message);
    console.error('🔍 Stack:', error.stack);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({
      success: false,
      error: `Erreur globale: ${error.message}`,
      debugInfo: {
        errorType: error.constructor.name,
        stack: error.stack
      },
      service: "VERCEL_DEBUG_SIMPLE",
      timestamp: new Date().toISOString()
    });
  }
}
