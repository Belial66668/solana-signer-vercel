// ========================================
// DÉCODAGE TRANSACTION NON-SIGNÉE JUPITER
// ========================================
console.log('🔓 Décodage transaction Jupiter non-signée...');

const transactionBuffer = Buffer.from(transaction, 'base64');
let tx;

try {
  // Jupiter envoie des transactions NON SIGNÉES
  // Il faut les décoder différemment
  
  // Essayer VersionedTransaction sans signature
  const versionedTx = VersionedTransaction.deserialize(transactionBuffer);
  tx = versionedTx;
  console.log('✅ VersionedTransaction non-signée décodée');
  
} catch (versionError) {
  try {
    // Fallback Legacy sans signature
    const legacyTx = Transaction.from(transactionBuffer);
    tx = legacyTx;
    console.log('✅ Legacy Transaction non-signée décodée');
    
  } catch (legacyError) {
    console.log('🔍 Errors - Versioned:', versionError.message);
    console.log('🔍 Errors - Legacy:', legacyError.message);
    throw new Error(`Transaction format non supporté`);
  }
}
