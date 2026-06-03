#!/bin/bash
# verify-emqx.sh - Verificar que EMQX está funcionando

set -e

echo "🔍 Verificando EMQX..."
echo ""

# 1. Verificar que el contenedor está corriendo
echo "1️⃣ Verificando contenedor..."
if docker ps | grep -q safeair-mqtt; then
    echo "✅ Contenedor safeair-mqtt está corriendo"
else
    echo "❌ Contenedor safeair-mqtt NO está corriendo"
    exit 1
fi

# 2. Verificar puerto 1883 (MQTT)
echo ""
echo "2️⃣ Verificando puerto 1883 (MQTT)..."
if nc -z localhost 1883 2>/dev/null; then
    echo "✅ Puerto 1883 está abierto"
else
    echo "❌ Puerto 1883 no responde"
    exit 1
fi

# 3. Verificar puerto 18083 (Dashboard)
echo ""
echo "3️⃣ Verificando puerto 18083 (Dashboard)..."
if nc -z localhost 18083 2>/dev/null; then
    echo "✅ Puerto 18083 está abierto"
    echo "   Dashboard: http://localhost:18083"
    echo "   Usuario: admin"
    echo "   Contraseña: public"
else
    echo "❌ Puerto 18083 no responde"
fi

# 4. Verificar que EMQX está listo
echo ""
echo "4️⃣ Verificando status de EMQX..."
STATUS=$(docker exec safeair-mqtt sh -c 'curl -s http://localhost:18083/api/v5/node | grep -o "node" || echo "error"' 2>/dev/null || echo "error")
if [ "$STATUS" != "error" ]; then
    echo "✅ EMQX está listo"
else
    echo "⏳ EMQX aún inicializando (espera 10s)..."
    sleep 10
fi

# 5. Ver logs
echo ""
echo "5️⃣ Últimos logs de EMQX:"
docker logs safeair-mqtt 2>/dev/null | tail -5

echo ""
echo "✅ Verificación completa"
echo ""
echo "Para publicar un mensaje de prueba:"
echo "  mosquitto_pub -h localhost -p 1883 -t test/topic -m 'Hello EMQX'"
echo ""
echo "Para suscribirse:"
echo "  mosquitto_sub -h localhost -p 1883 -t test/topic"
