#!/bin/bash

# ============================================================================
# Setup Vercel para Maya Autopartes
# ============================================================================
# Este script configura automáticamente el proyecto en Vercel
#
# Uso: bash scripts/setup-vercel.sh
#
# Requisitos:
# - Vercel CLI instalado: npm install -g vercel
# - Estar logueado: vercel login
# ============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de logging
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar si Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    log_error "Vercel CLI no está instalado"
    log_info "Instálalo con: npm install -g vercel"
    exit 1
fi

log_info "Verificando autenticación con Vercel..."
if ! vercel whoami &> /dev/null; then
    log_error "No estás logueado en Vercel"
    log_info "Ejecuta: vercel login"
    exit 1
fi

log_success "Autenticado con Vercel"

# Header
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        🚀 Setup de Vercel para Maya Autopartes                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Paso 1: Verificar que estamos en el directorio correcto
log_info "Verificando estructura del proyecto..."
if [ ! -f "vercel.json" ]; then
    log_error "vercel.json no encontrado. ¿Estás en el directorio correcto?"
    exit 1
fi
log_success "Estructura del proyecto verificada"

# Paso 2: Instalar dependencias
log_info "Instalando dependencias..."
npm install --silent
log_success "Dependencias instaladas"

# Paso 3: Hacer link del proyecto en Vercel
log_info "Vinculando proyecto en Vercel..."
vercel link --yes || log_warning "El proyecto ya está vinculado"
log_success "Proyecto vinculado"

# Paso 4: Mostrar variables necesarias
echo ""
log_info "Variables de entorno a configurar en Vercel:"
echo ""
echo "Abre: https://vercel.com/dashboard"
echo "Luego: Selecciona proyecto > Settings > Environment Variables"
echo ""
echo -e "${YELLOW}Variables críticas:${NC}"
echo "  • SUPABASE_URL"
echo "  • SUPABASE_KEY"
echo "  • SUPABASE_SECRET_KEY"
echo "  • JWT_SECRET"
echo "  • SENTRY_DSN"
echo ""

# Paso 5: Opción para configurar variables automáticamente
echo ""
read -p "¿Deseas configurar las variables automáticamente? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    log_info "Ingresa los valores (presiona Enter para omitir)"

    read -p "SUPABASE_URL: " SUPABASE_URL
    [ -n "$SUPABASE_URL" ] && vercel env add SUPABASE_URL <<< "$SUPABASE_URL"

    read -p "SUPABASE_KEY: " SUPABASE_KEY
    [ -n "$SUPABASE_KEY" ] && vercel env add SUPABASE_KEY <<< "$SUPABASE_KEY"

    read -p "JWT_SECRET: " JWT_SECRET
    [ -n "$JWT_SECRET" ] && vercel env add JWT_SECRET <<< "$JWT_SECRET"

    read -p "SENTRY_DSN (opcional): " SENTRY_DSN
    [ -n "$SENTRY_DSN" ] && vercel env add SENTRY_DSN <<< "$SENTRY_DSN"

    log_success "Variables configuradas"
fi

# Paso 6: Hacer pull de variables
log_info "Descargando configuración de Vercel..."
vercel pull --yes
log_success "Configuración descargada"

# Paso 7: Hacer preview deploy
echo ""
read -p "¿Deseas hacer un preview deploy ahora? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    log_info "Haciendo preview deploy..."
    PREVIEW_URL=$(vercel)
    log_success "Preview disponible en: $PREVIEW_URL"
fi

# Paso 8: Resumen
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                 ✅ Setup completado                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Próximos pasos:${NC}"
echo "  1. Configura variables faltantes en:"
echo "     https://vercel.com/dashboard > [Proyecto] > Settings > Environment Variables"
echo ""
echo "  2. Haz push a main para deploy automático:"
echo "     git push origin main"
echo ""
echo "  3. Monitorea el deployment:"
echo "     GitHub Actions: https://github.com/tu-repo/actions"
echo "     Vercel Dashboard: https://vercel.com/dashboard"
echo ""
echo -e "${GREEN}Documentación:${NC}"
echo "  Ver DEPLOY_PRODUCTION.md para guía completa"
echo ""
