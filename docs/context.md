Criando um documento de contexto para o frontend. Verificando a estrutura atual:


[4 tools called]


Criando um documento de contexto para o frontend. Segue o conteúdo:

---

# Documento de Contexto - Integração Frontend

## Informações da API

**URL Base (Produção):**
```
https://biofouling-api-454735405258.us-central1.run.app
```

**URL Base (Desenvolvimento Local):**
```
http://localhost:8000
```

**Documentação Interativa (Swagger):**
```
https://biofouling-api-454735405258.us-central1.run.app/docs
```

---

## O que foi implementado

### Funcionalidades principais
1. Predição de biofouling (nível 0-3) via API externa de ML
2. Cálculo científico de impacto:
   - Potência (base vs. com fouling)
   - Consumo de combustível
   - Emissões de CO₂
   - Custos (OPEX + EU ETS)
   - Conversão automática USD/BRL

### Base científica
- ISO 19030:2016
- IMO MEPC.308(73)
- Schultz et al. (2011)
- Song et al. (2020)

---

## Endpoints disponíveis

### 1. Health Check
```http
GET /health
```

**Resposta:**
```json
{
  "status": "healthy",
  "model_status": "configured",
  "service": "biofouling-prediction-api"
}
```

---

### 2. Predição Simples (sem análise de impacto)
```http
POST /api/v1/predict
Content-Type: application/json
```

**Body:**
```json
{
  "shipName": "NAVIO-123",
  "speed": 15.0,
  "duration": 10.0,
  "distance": 3600.0,
  "beaufortScale": 3,
  "Area_Molhada": 5000.0,
  "MASSA_TOTAL_TON": 50000.0,
  "TIPO_COMBUSTIVEL_PRINCIPAL": "LSHFO",
  "decLatitude": -23.0,
  "decLongitude": -43.0,
  "DiasDesdeUltimaLimpeza": 180.0
}
```

**Resposta:**
```json
{
  "ship_id": "NAVIO-123",
  "biofouling_level": 2,
  "risk_category": "High",
  "recommended_action": "Schedule cleaning within 1 month",
  "estimated_fuel_impact": 15.0,
  "confidence_score": 0.85,
  "timestamp": "2025-11-30T17:30:00Z",
  "impact_analysis": null
}
```

---

### 3. Predição com análise de impacto (recomendado)

```http
POST /api/v1/predict/with-impact?fuel_type=LSHFO&currency=BRL
Content-Type: application/json
```

**Query Parameters:**
- `fuel_type` (opcional, padrão: "LSHFO")
  - Valores: `LSHFO`, `ULSMGO`, `LSMGO`, `VLSHFO`, `VLSFO`, `MGO`, `HFO`, `LNG`
- `currency` (opcional, padrão: "USD")
  - Valores: `USD` ou `BRL`
  - Ambos os valores são sempre retornados; este indica preferência

**Body:** (mesmo do endpoint anterior)

**Resposta Completa:**
```json
{
  "ship_id": "NAVIO-123",
  "biofouling_level": 2,
  "risk_category": "High",
  "recommended_action": "Schedule cleaning within 1 month",
  "estimated_fuel_impact": 15.0,
  "confidence_score": 0.85,
  "timestamp": "2025-11-30T17:30:00Z",
  "impact_analysis": {
    "base_power_kw": 8500.0,
    "fouled_power_kw": 11220.0,
    "delta_power_kw": 2720.0,
    "delta_power_percent": 32.0,
    "base_fuel_tons": 50.0,
    "extra_fuel_tons": 16.0,
    "total_fuel_tons": 66.0,
    "extra_fuel_percent": 32.0,
    "extra_cost_usd": 11048.0,
    "extra_cost_brl": 55240.0,
    "extra_co2_tons": 50.4,
    "eu_ets_cost_usd": 4841.4,
    "eu_ets_cost_brl": 24207.0,
    "total_cost_usd": 15889.4,
    "total_cost_brl": 79447.0,
    "fuel_type": "LSHFO",
    "biofouling_description": "Incrustação Calcária Média",
    "ks_range_um": [1000, 3000],
    "exchange_rate_used": 5.0,
    "preferred_currency": "BRL"
  }
}
```

---

### 4. Predição em lote
```http
POST /api/v1/predict/batch
Content-Type: application/json
```

**Body:**
```json
{
  "voyages": [
    { /* VoyageData 1 */ },
    { /* VoyageData 2 */ }
  ]
}
```

---

## Estrutura de dados

### VoyageData (Input)
```typescript
interface VoyageData {
  shipName: string;              // Nome do navio
  speed: number;                 // Velocidade em nós
  duration: number;              // Duração em dias
  distance: number;             // Distância em milhas náuticas
  beaufortScale: number;         // Escala Beaufort (0-12)
  Area_Molhada: number;          // Área molhada em m²
  MASSA_TOTAL_TON: number;       // Massa total em toneladas
  TIPO_COMBUSTIVEL_PRINCIPAL: string;  // Tipo de combustível
  decLatitude: number;           // Latitude decimal
  decLongitude: number;          // Longitude decimal
  DiasDesdeUltimaLimpeza: number; // Dias desde última limpeza
}
```

### PredictionResult (Output)
```typescript
interface PredictionResult {
  ship_id: string;
  biofouling_level: number;      // 0-3 (0=limpo, 3=severo)
  risk_category: string;          // "Low" | "Medium" | "High" | "Critical"
  recommended_action: string;
  estimated_fuel_impact: number;  // % de aumento estimado
  confidence_score: number;      // 0-1
  timestamp: string;              // ISO 8601
  impact_analysis?: ImpactAnalysis; // Opcional (só vem no /with-impact)
}
```

### ImpactAnalysis (Análise Detalhada)
```typescript
interface ImpactAnalysis {
  // Potência
  base_power_kw: number;          // Potência base (casco limpo)
  fouled_power_kw: number;        // Potência com biofouling
  delta_power_kw: number;         // Aumento de potência
  delta_power_percent: number;    // % de aumento
  
  // Combustível
  base_fuel_tons: number;         // Consumo base
  extra_fuel_tons: number;        // Consumo extra
  total_fuel_tons: number;        // Consumo total
  extra_fuel_percent: number;     // % de aumento
  
  // Custos (USD)
  extra_cost_usd: number;         // Custo OPEX
  eu_ets_cost_usd: number;        // Custo EU ETS
  total_cost_usd: number;         // Custo total
  
  // Custos (BRL)
  extra_cost_brl: number;
  eu_ets_cost_brl: number;
  total_cost_brl: number;
  
  // Emissões
  extra_co2_tons: number;         // Emissões extras de CO₂
  
  // Metadados
  fuel_type: string;              // Tipo de combustível usado
  biofouling_description: string; // Descrição do nível
  ks_range_um: [number, number];  // Range de rugosidade
  exchange_rate_used: number;      // Taxa de câmbio usada
  preferred_currency: string;      // "USD" ou "BRL"
}
```

---

## Exemplos de integração

### JavaScript/TypeScript (Fetch API)

```typescript
const API_BASE_URL = 'https://biofouling-api-454735405258.us-central1.run.app';

async function predictWithImpact(voyageData: VoyageData, fuelType = 'LSHFO', currency = 'BRL') {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/predict/with-impact?fuel_type=${fuelType}&currency=${currency}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(voyageData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro na requisição');
    }

    const result: PredictionResult = await response.json();
    return result;
  } catch (error) {
    console.error('Erro ao fazer predição:', error);
    throw error;
  }
}

// Uso
const voyageData = {
  shipName: "NAVIO-123",
  speed: 15.0,
  duration: 10.0,
  distance: 3600.0,
  beaufortScale: 3,
  Area_Molhada: 5000.0,
  MASSA_TOTAL_TON: 50000.0,
  TIPO_COMBUSTIVEL_PRINCIPAL: "LSHFO",
  decLatitude: -23.0,
  decLongitude: -43.0,
  DiasDesdeUltimaLimpeza: 180.0
};

const result = await predictWithImpact(voyageData, 'LSHFO', 'BRL');
console.log('Custo Total:', result.impact_analysis?.total_cost_brl);
```

---

### React Hook Example

```typescript
import { useState } from 'react';

function useBiofoulingPrediction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);

  const predict = async (
    voyageData: VoyageData,
    fuelType = 'LSHFO',
    currency = 'BRL'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/predict/with-impact?fuel_type=${fuelType}&currency=${currency}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(voyageData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erro na requisição');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return { predict, loading, error, result };
}
```

---

### Componente React de Exibição

```tsx
function ImpactDisplay({ impact }: { impact: ImpactAnalysis }) {
  const currency = impact.preferred_currency;
  const totalCost = currency === 'BRL' ? impact.total_cost_brl : impact.total_cost_usd;
  const currencySymbol = currency === 'BRL' ? 'R$' : 'US$';

  return (
    <div className="impact-analysis">
      <h3>Análise de Impacto</h3>
      
      {/* Potência */}
      <section>
        <h4>Potência</h4>
        <p>Base: {impact.base_power_kw.toLocaleString()} kW</p>
        <p>Com Fouling: {impact.fouled_power_kw.toLocaleString()} kW</p>
        <p className="highlight">
          Aumento: {impact.delta_power_percent}% (+{impact.delta_power_kw.toLocaleString()} kW)
        </p>
      </section>

      {/* Combustível */}
      <section>
        <h4>Combustível</h4>
        <p>Consumo Extra: {impact.extra_fuel_tons.toFixed(2)} toneladas</p>
        <p>Aumento: {impact.extra_fuel_percent}%</p>
      </section>

      {/* Custos */}
      <section>
        <h4>Custos ({currency})</h4>
        <p>OPEX: {currencySymbol} {impact[`extra_cost_${currency.toLowerCase()}`].toLocaleString()}</p>
        <p>EU ETS: {currencySymbol} {impact[`eu_ets_cost_${currency.toLowerCase()}`].toLocaleString()}</p>
        <p className="highlight">
          Total: {currencySymbol} {totalCost.toLocaleString()}
        </p>
      </section>

      {/* CO₂ */}
      <section>
        <h4>Emissões</h4>
        <p>CO₂ Extra: {impact.extra_co2_tons.toFixed(2)} toneladas</p>
      </section>

      {/* Info */}
      <section>
        <p><strong>Tipo:</strong> {impact.biofouling_description}</p>
        <p><strong>Combustível:</strong> {impact.fuel_type}</p>
        <p><small>Taxa de câmbio: {impact.exchange_rate_used}</small></p>
      </section>
    </div>
  );
}
```

---

## Validações e tratamento de erros

### Códigos de status HTTP
- `200 OK` - Sucesso
- `400 Bad Request` - Dados inválidos (ex: fuel_type inválido, currency inválido)
- `503 Service Unavailable` - API externa indisponível
- `500 Internal Server Error` - Erro interno

### Exemplo de tratamento de erros

```typescript
try {
  const result = await predictWithImpact(voyageData);
  // Sucesso
} catch (error) {
  if (error.response?.status === 400) {
    // Erro de validação - mostrar mensagem ao usuário
    console.error('Dados inválidos:', error.response.data.detail);
  } else if (error.response?.status === 503) {
    // Serviço indisponível - tentar novamente depois
    console.error('Serviço temporariamente indisponível');
  } else {
    // Erro genérico
    console.error('Erro desconhecido:', error);
  }
}
```

---

## Níveis de biofouling

| Nível | Descrição | Categoria | Ação Recomendada |
|-------|-----------|-----------|------------------|
| 0 | Hidraulicamente Liso | Low | Rotina de monitoramento |
| 1 | Slime Leve / Biofilme | Medium | Inspeção em 3 meses |
| 2 | Incrustação Calcária Média | High | Limpeza em 1 mês |
| 3 | Incrustação Calcária Pesada | Critical | Limpeza imediata |

---

## Tipos de combustível suportados

- `LSHFO` - Low Sulphur Heavy Fuel Oil (padrão)
- `ULSMGO` - Ultra Low Sulphur Marine Gas Oil
- `LSMGO` - Low Sulphur Marine Gas Oil
- `VLSHFO` - Very Low Sulphur Heavy Fuel Oil
- `VLSFO` - Very Low Sulphur Fuel Oil
- `MGO` - Marine Gas Oil
- `HFO` - Heavy Fuel Oil
- `LNG` - Liquefied Natural Gas

---

## Próximos passos sugeridos para o frontend

1. Criar formulário de entrada com validação dos campos VoyageData
2. Implementar chamada ao endpoint `/api/v1/predict/with-impact`
3. Criar componentes de visualização:
   - Cards de métricas principais
   - Gráficos de impacto (potência, combustível, custos)
   - Tabela comparativa (antes/depois)
   - Indicador visual do nível de biofouling
4. Implementar seleção de moeda (USD/BRL)
5. Adicionar tratamento de erros e loading states
6. Implementar cache de resultados (opcional)
7. Adicionar exportação de relatórios (PDF/Excel)

---

## CORS

A API aceita requisições de:
- `http://localhost:3000` (desenvolvimento)
- `https://biofouling-frontend.vercel.app` (produção)

Se precisar adicionar outra origem, avise para atualizar o backend.

---

## Notas importantes

1. Ambos os valores (USD e BRL) são sempre retornados; use `preferred_currency` para escolher qual exibir
2. O campo `impact_analysis` só existe quando usar `/predict/with-impact`
3. A taxa de câmbio é atualizada automaticamente (cache de 1h)
4. Todos os cálculos são baseados em fórmulas científicas validadas
5. O `biofouling_level` vem da API externa de ML; os cálculos de impacto são feitos localmente no backend

---

Salve este documento no repositório do frontend como `docs/api-integration.md` ou `docs/