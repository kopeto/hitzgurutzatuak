#!/bin/bash

# Script de corrección de seguridad para hitzgurutzatuak
# Implementa las correcciones de Fase 1 (Críticas) automáticamente

set -e  # Exit on error

echo "🔐 Iniciando corrección de vulnerabilidades críticas..."
echo ""

# Backup de package.json
echo "📦 Creando backup de package.json..."
cp package.json package.json.backup
echo "✅ Backup creado: package.json.backup"
echo ""

# 1. Remover connect-multiparty
echo "🗑️  Removiendo connect-multiparty (vulnerabilidad alta)..."
npm uninstall connect-multiparty
echo "✅ connect-multiparty eliminado"
echo ""

# 2. Instalar paquetes de seguridad
echo "🛡️  Instalando paquetes de seguridad..."
npm install helmet express-rate-limit --save
echo "✅ helmet y express-rate-limit instalados"
echo ""

# 3. Actualizar dependencias sin breaking changes
echo "🔄 Actualizando dependencias seguras..."
npm audit fix
echo "✅ Vulnerabilidades sin breaking changes corregidas"
echo ""

# 4. Actualizar nodemon (solo dev, seguro)
echo "🔄 Actualizando nodemon..."
npm install nodemon@latest --save-dev
echo "✅ nodemon actualizado"
echo ""

# 5. Limpiar
echo "🧹 Limpiando dependencias no usadas..."
npm prune
echo "✅ Limpieza completada"
echo ""

echo "════════════════════════════════════════════════"
echo "✅ Fase 1 completada - Vulnerabilidades críticas corregidas"
echo ""
echo "⚠️  ACCIÓN REQUERIDA:"
echo "1. Revisar routes/puzzles.js y eliminar líneas de connect-multiparty"
echo "2. Revisar config/uploadconfig.js y aplicar sanitización"
echo "3. Agregar helmet y rate-limit a app.js"
echo "4. Ejecutar: npm test"
echo "5. Ejecutar: npm start (verificar que funciona)"
echo ""
echo "📋 Para ver el informe completo:"
echo "   cat docs/SECURITY_AUDIT.md"
echo ""
echo "🚀 Siguiente fase (breaking changes):"
echo "   ./scripts/security-phase2.sh"
echo "════════════════════════════════════════════════"
