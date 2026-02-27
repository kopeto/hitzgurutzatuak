#!/bin/bash

# 🧪 Script de prueba de la API de juego
# Ejecutar con: bash tests/test-game-api.sh

echo "🎮 TESTING GAME API - Hitzgurutzatuak"
echo "======================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
BASE_URL="http://localhost:3000"
COOKIE_FILE="/tmp/hitzgurutzatuak_test_cookies.txt"
TEST_PUZZLE_ID="698f64d2b5ccb935c826a6dd"  # Ajustar según tu DB

# Función para imprimir resultados
print_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC} - $2"
  else
    echo -e "${RED}✗ FAIL${NC} - $2"
  fi
}

# Limpiar cookies anteriores
rm -f $COOKIE_FILE

echo "📝 Prerequisitos:"
echo "   - Servidor corriendo en $BASE_URL"
echo "   - MongoDB conectado"
echo "   - Usuario registrado: testuser / password123"
echo ""

# TEST 1: Login para obtener sesión
echo "🔐 TEST 1: Autenticación"
LOGIN_RESPONSE=$(curl -s -c $COOKIE_FILE -X POST $BASE_URL/users/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=password123")

if grep -q "connect.sid" $COOKIE_FILE; then
  print_result 0 "Login exitoso, sesión obtenida"
else
  print_result 1 "Login fallido, no se obtuvo sesión"
  echo "   ⚠️  Crear usuario: curl -X POST $BASE_URL/users/register -d 'username=testuser&password=password123&email=test@test.com'"
  exit 1
fi
echo ""

# TEST 2: Iniciar juego
echo "🎯 TEST 2: Iniciar sesión de juego"
START_RESPONSE=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/api/game/start/$TEST_PUZZLE_ID \
  -H "Content-Type: application/json")

if echo "$START_RESPONSE" | grep -q '"success":true'; then
  print_result 0 "Juego iniciado correctamente"
  
  # Verificar que NO se envía filled_grid
  if echo "$START_RESPONSE" | grep -q 'filled_grid'; then
    print_result 1 "⚠️  SEGURIDAD: filled_grid expuesto en la respuesta"
  else
    print_result 0 "filled_grid NO expuesto (seguro)"
  fi
  
  # Verificar que se envía void_grid
  if echo "$START_RESPONSE" | grep -q 'void_grid'; then
    print_result 0 "void_grid enviado correctamente"
  else
    print_result 1 "void_grid no encontrado"
  fi
else
  print_result 1 "Error al iniciar juego"
  echo "   Response: $START_RESPONSE"
  exit 1
fi
echo ""

# TEST 3: Verificar celda (sin sesión)
echo "🔒 TEST 3: Middleware de sesión"
NO_SESSION=$(curl -s -X POST $BASE_URL/api/game/check-cell \
  -H "Content-Type: application/json" \
  -d '{"row":0,"col":0,"value":"E"}')

if echo "$NO_SESSION" | grep -q 'No hay juego activo'; then
  print_result 0 "Middleware bloquea acceso sin sesión"
else
  print_result 1 "Middleware NO bloquea acceso sin sesión"
fi
echo ""

# TEST 4: Verificar celda correcta
echo "✅ TEST 4: Verificar celda correcta"
CHECK_CELL=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/api/game/check-cell \
  -H "Content-Type: application/json" \
  -d '{"row":0,"col":2,"value":"E"}')

if echo "$CHECK_CELL" | grep -q '"success":true'; then
  print_result 0 "Endpoint check-cell funciona"
  
  # Verificar que NO revela la respuesta
  if echo "$CHECK_CELL" | grep -q '"correct":'; then
    print_result 0 "Respuesta contiene campo 'correct'"
  else
    print_result 1 "Respuesta no contiene campo 'correct'"
  fi
else
  print_result 1 "Error en check-cell"
fi
echo ""

# TEST 5: Verificar celda incorrecta
echo "❌ TEST 5: Verificar celda incorrecta"
CHECK_WRONG=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/api/game/check-cell \
  -H "Content-Type: application/json" \
  -d '{"row":0,"col":2,"value":"Z"}')

if echo "$CHECK_WRONG" | grep -q '"correct":false'; then
  print_result 0 "Detecta celda incorrecta"
  
  # Verificar que NO revela la respuesta correcta
  if echo "$CHECK_WRONG" | grep -q '"value":'; then
    print_result 1 "⚠️  SEGURIDAD: Revela respuesta en check-cell"
  else
    print_result 0 "NO revela respuesta en check-cell (seguro)"
  fi
else
  print_result 1 "Error al detectar celda incorrecta"
fi
echo ""

# TEST 6: Verificar palabra
echo "📝 TEST 6: Verificar palabra completa"
CHECK_WORD=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/api/game/check-word \
  -H "Content-Type: application/json" \
  -d '{"wordIndex":0}')

if echo "$CHECK_WORD" | grep -q '"success":true'; then
  print_result 0 "Endpoint check-word funciona"
else
  print_result 1 "Error en check-word"
fi
echo ""

# TEST 7: Pista de celda
echo "💡 TEST 7: Solicitar pista de celda"
SOLVE_CELL=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/api/game/solve-cell \
  -H "Content-Type: application/json" \
  -d '{"row":0,"col":3}')

if echo "$SOLVE_CELL" | grep -q '"value":'; then
  print_result 0 "Pista de celda revelada"
else
  print_result 1 "Error al revelar pista"
fi
echo ""

# TEST 8: Pista de palabra
echo "📖 TEST 8: Solicitar pista de palabra completa"
SOLVE_WORD=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/api/game/solve-word \
  -H "Content-Type: application/json" \
  -d '{"wordIndex":0}')

if echo "$SOLVE_WORD" | grep -q '"solvedLetters":'; then
  print_result 0 "Pista de palabra revelada"
else
  print_result 1 "Error al revelar palabra"
fi
echo ""

# TEST 9: Verificar grid
echo "🗒️  TEST 9: Verificar estado del grid"
CHECK_GRID=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/api/game/check-grid \
  -H "Content-Type: application/json")

if echo "$CHECK_GRID" | grep -q '"progress":'; then
  print_result 0 "Estado del grid obtenido"
  
  # Verificar que NO revela posiciones de errores
  if echo "$CHECK_GRID" | grep -q '"errorPositions":'; then
    print_result 1 "⚠️  Revela posiciones de errores (puede facilitar trampa)"
  else
    print_result 0 "NO revela posiciones de errores (seguro)"
  fi
else
  print_result 1 "Error al obtener estado del grid"
fi
echo ""

# TEST 10: Estado del juego
echo "📊 TEST 10: Obtener estado del juego"
GAME_STATUS=$(curl -s -b $COOKIE_FILE $BASE_URL/api/game/status)

if echo "$GAME_STATUS" | grep -q '"puzzleId":'; then
  print_result 0 "Estado del juego obtenido"
  
  # Verificar que tiene estadísticas
  if echo "$GAME_STATUS" | grep -q '"checkCount":'; then
    print_result 0 "Estadísticas registradas (checkCount)"
  fi
  
  if echo "$GAME_STATUS" | grep -q '"hintCount":'; then
    print_result 0 "Estadísticas registradas (hintCount)"
  fi
else
  print_result 1 "Error al obtener estado"
fi
echo ""

# TEST 11: Revelar solución completa
echo "🔓 TEST 11: Revelar solución completa (rendirse)"
SOLVE_GRID=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/api/game/solve-grid \
  -H "Content-Type: application/json")

if echo "$SOLVE_GRID" | grep -q '"solvedLetters":'; then
  print_result 0 "Solución completa revelada"
else
  print_result 1 "Error al revelar solución"
fi
echo ""

# TEST 12: Finalizar juego
echo "🏁 TEST 12: Finalizar sesión de juego"
END_GAME=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/api/game/end \
  -H "Content-Type: application/json")

if echo "$END_GAME" | grep -q '"stats":'; then
  print_result 0 "Juego finalizado con estadísticas"
else
  print_result 1 "Error al finalizar juego"
fi
echo ""

# TEST 13: Verificar sesión limpiada
echo "🧹 TEST 13: Verificar limpieza de sesión"
AFTER_END=$(curl -s -b $COOKIE_FILE -X POST $BASE_URL/api/game/check-cell \
  -H "Content-Type: application/json" \
  -d '{"row":0,"col":0,"value":"E"}')

if echo "$AFTER_END" | grep -q 'No hay juego activo'; then
  print_result 0 "Sesión correctamente limpiada"
else
  print_result 1 "Sesión NO limpiada correctamente"
fi
echo ""

# Limpieza
rm -f $COOKIE_FILE

echo "======================================"
echo "✅ Tests completados"
echo ""
echo "📋 RESUMEN DE SEGURIDAD:"
echo "   - filled_grid NUNCA debe aparecer en respuestas"
echo "   - Respuestas correctas solo se revelan con solve-*"
echo "   - Middleware protege endpoints sin sesión"
echo "   - Estadísticas se registran correctamente"
echo ""
echo "⚠️  NOTA: Este script requiere:"
echo "   1. Servidor corriendo (npm start)"
echo "   2. Usuario testuser/password123 registrado"
echo "   3. Puzzle con ID $TEST_PUZZLE_ID en MongoDB"
echo ""
