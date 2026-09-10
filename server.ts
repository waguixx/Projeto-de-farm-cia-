import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { POPULAR_MEDICINES } from "./src/data/popularMedicines";
import { CatalogMedicine } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const analysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      description: "'success', 'illegible' (se imagem de receita for ilegível/duvidosa), ou 'not_found'",
    },
    commercialName: {
      type: Type.STRING,
      description: "Nome comercial ou de referência do remédio identificado (ex: Glifage XR, Tylenol 750mg, Dorflex, Losartana)",
    },
    activeIngredient: {
      type: Type.STRING,
      description: "Princípio ativo oficial de acordo com a Denominação Comum Brasileira (DCB) da ANVISA",
    },
    dosage: {
      type: Type.STRING,
      description: "Dosagem identificada ou recomendada de referência (ex: 500 mg, 850 mg, 750 mg)",
    },
    purpose: {
      type: Type.STRING,
      description: "Breve resumo em português (1 a 2 frases diretas) explicando para que serve o remédio e exatamente o que ele resolve (sintomas ou doença que trata), em linguagem simples para qualquer paciente entender.",
    },
    dosageInfo: {
      type: Type.STRING,
      description: "Posologia e dosagem segura para adultos (intervalos de horas, quantidade máxima por tomada e limite diário).",
    },
    precautions: {
      type: Type.STRING,
      description: "Contraindicações principais, restrições para gestantes, hipertensos, pessoas com problemas hepáticos/renais ou alergias.",
    },
    susAvailability: {
      type: Type.OBJECT,
      properties: {
        isFreeInSUS: {
          type: Type.BOOLEAN,
          description: "Se o remédio pode ser retirado de graça no SUS (UBS / Postos de Saúde ou Farmácia Popular)",
        },
        badgeText: {
          type: Type.STRING,
          description: "Ex: '100% Gratuito no Posto de Saúde SUS (RENAME)' ou 'Disponível com receita'",
        },
        instructions: {
          type: Type.STRING,
          description: "Instrução clara de como retirar no SUS (Cartão SUS, receita médica, etc.)",
        },
        requiresPrescription: {
          type: Type.BOOLEAN,
          description: "Se exige receita médica para retirada no SUS",
        },
      },
      required: ["isFreeInSUS", "badgeText", "instructions"],
    },
    quickTips: {
      type: Type.ARRAY,
      description: "2 a 3 orientações práticas para o paciente (ex: tomar com água, com ou sem alimentos, tempo de início do alívio)",
      items: {
        type: Type.STRING,
      },
    },
    howToAsk: {
      type: Type.STRING,
      description: "Instrução e frase exata para o usuário falar diretamente ao atendente no balcão da farmácia.",
    },
    equivalentMedicines: {
      type: Type.ARRAY,
      description: "Opções de remédios equivalentes que o paciente pode tomar: Genéricos oficiais certificados e similares intercambiáveis",
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description: "'generico', 'similar_intercambiavel' ou 'referencia'",
          },
          name: {
            type: Type.STRING,
            description: "Nome do medicamento genérico ou similar (ex: Metformina 500mg Genérico, Glifage de Referência)",
          },
          activeIngredient: {
            type: Type.STRING,
            description: "Princípio ativo correspondente",
          },
          dosage: {
            type: Type.STRING,
            description: "Dosagem disponível",
          },
          badge: {
            type: Type.STRING,
            description: "Destaque (ex: 'Tarja Amarela ANVISA', 'Similar Intercambiável')",
          },
          savingsEstimated: {
            type: Type.STRING,
            description: "Estimativa de economia (ex: 'Economia de 50% a 70%')",
          },
        },
        required: ["type", "name", "activeIngredient", "dosage", "badge", "savingsEstimated"],
      },
    },
    tarjaAmarelaInfo: {
      type: Type.OBJECT,
      properties: {
        badgeText: {
          type: Type.STRING,
        },
        lawReference: {
          type: Type.STRING,
        },
        savingsPercentRange: {
          type: Type.STRING,
        },
        explanation: {
          type: Type.STRING,
        },
      },
      required: ["badgeText", "lawReference", "savingsPercentRange", "explanation"],
    },
    farmaciaPopular: {
      type: Type.OBJECT,
      properties: {
        isEligible: {
          type: Type.BOOLEAN,
        },
        statusType: {
          type: Type.STRING,
          description: "'gratuito', 'copagamento' ou 'nao_coberto'",
        },
        badgeText: {
          type: Type.STRING,
        },
        conditionName: {
          type: Type.STRING,
        },
        instructions: {
          type: Type.STRING,
        },
      },
      required: ["isEligible", "statusType", "badgeText", "instructions"],
    },
    anvisaRegulation: {
      type: Type.OBJECT,
      properties: {
        bioequivalent: {
          type: Type.BOOLEAN,
        },
        details: {
          type: Type.STRING,
        },
      },
      required: ["bioequivalent", "details"],
    },
    disclaimer: {
      type: Type.STRING,
    },
    illegibleMessage: {
      type: Type.STRING,
    },
  },
  required: [
    "status",
    "commercialName",
    "activeIngredient",
    "dosage",
    "purpose",
    "howToAsk",
    "tarjaAmarelaInfo",
    "farmaciaPopular",
    "anvisaRegulation",
    "disclaimer",
  ],
};

const symptomAnalysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      description: "'success', 'urgent_care' (se apresentar sinais claros de emergência médica imediata), ou 'not_found'",
    },
    symptomQuery: {
      type: Type.STRING,
      description: "Sintoma ou queixa relatada pelo usuário",
    },
    clinicalOverview: {
      type: Type.STRING,
      description: "Explicação em português simples, empática e objetiva (2 a 3 frases) sobre o que costuma causar esses sintomas e recomendações iniciais de cuidado.",
    },
    recommendedMedicines: {
      type: Type.ARRAY,
      description: "Lista de 2 a 4 opções de remédios seguros e comuns que o paciente pode tomar para aliviar esse sintoma, priorizando medicamentos isentos de prescrição (MIPs) ou classes farmacêuticas de primeira linha com alternativas de genéricos e gratuidade no SUS.",
      items: {
        type: Type.OBJECT,
        properties: {
          referenceName: {
            type: Type.STRING,
            description: "Nome comercial conhecido de referência (ex: Tylenol, Novalgina, Buscopan, Omeprazol, Dorflex, Polaramine)",
          },
          activeIngredient: {
            type: Type.STRING,
            description: "Princípio ativo oficial ANVISA - Denominação Comum Brasileira (DCB)",
          },
          dosage: {
            type: Type.STRING,
            description: "Dosagem usual para adultos (ex: 500mg a 750mg, 20mg em jejum, 10mg)",
          },
          whyItHelps: {
            type: Type.STRING,
            description: "Como e por que esse remédio age para aliviar especificamente a queixa ou dor relatada",
          },
          susAvailability: {
            type: Type.OBJECT,
            properties: {
              status: {
                type: Type.STRING,
                description: "'gratuito_sus' (100% gratuito no Posto de Saúde/UBS ou Farmácia Popular), 'copagamento' (até 90% de desconto pelo Farmácia Popular) ou 'particular_generico' (venda em farmácia com genérico barato)",
              },
              badgeText: {
                type: Type.STRING,
                description: "Selo, ex: '🟢 100% Gratuito no SUS / Farmácia Popular', '🟡 Co-pagamento Farmácia Popular', ou '⚪ Genérico Econômico na Drogaria'",
              },
              instructions: {
                type: Type.STRING,
                description: "Instrução clara sobre onde e como obter (levar receita e documento no Posto SUS ou pedir genérico na drogaria)",
              },
              requiresPrescription: {
                type: Type.BOOLEAN,
                description: "Verdadeiro se exige receita médica ou falso se for de venda livre (MIP)",
              },
            },
            required: ["status", "badgeText", "instructions", "requiresPrescription"],
          },
          howToAskAtCounter: {
            type: Type.STRING,
            description: "Frase pronta para o usuário pedir no balcão da farmácia",
          },
          precautions: {
            type: Type.STRING,
            description: "Cuidados e contraindicações básicas essenciais (ex: não exceder dosagem diária, evitar em caso de gastrite/úlcera)",
          },
        },
        required: [
          "referenceName",
          "activeIngredient",
          "dosage",
          "whyItHelps",
          "susAvailability",
          "howToAskAtCounter",
          "precautions",
        ],
      },
    },
    warningSigns: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de 3 a 5 sinais de alarme em que o paciente deve procurar atendimento médico de urgência (UPA ou Pronto-Socorro) sem demora",
    },
    homeCareTips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de 2 a 4 cuidados não farmacológicos caseiros complementares (ex: hidratação oral, repouso, compressas)",
    },
    disclaimer: {
      type: Type.STRING,
      description: "Aviso de segurança legal e farmacêutico",
    },
  },
  required: [
    "status",
    "symptomQuery",
    "clinicalOverview",
    "recommendedMedicines",
    "warningSigns",
    "homeCareTips",
    "disclaimer",
  ],
};

// Curated instant ANVISA knowledge base for popular Brazilian medicines
const BRAZILIAN_MEDICINES_DB: Record<string, any> = {
  glifage: {
    status: "success",
    commercialName: "Glifage® (Glifage XR)",
    activeIngredient: "Cloridrato de Metformina",
    dosage: "500 mg / 850 mg",
    purpose: "Medicamento antidiabético oral que reduz os níveis de açúcar no sangue. Indicado para o tratamento do Diabetes Mellitus tipo 2 e prevenção de complicações vasculares.",
    howToAsk: "Por favor, você tem o genérico de Cloridrato de Metformina de 500mg?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "40% a 70%",
      explanation: "O genérico de Cloridrato de Metformina possui a mesma eficácia terapêutica, biodisponibilidade e segurança do Glifage, devidamente aprovado pela ANVISA.",
    },
    farmaciaPopular: {
      isEligible: true,
      statusType: "gratuito",
      badgeText: "100% Gratuito pelo SUS (Diabetes)",
      conditionName: "Diabetes Mellitus",
      instructions: "Disponível com gratuidade total no Farmácia Popular. Basta levar receita médica válida (SUS ou particular), documento oficial com foto e seu CPF numa farmácia credenciada.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Bioequivalência plena comprovada pela ANVISA, assegurando a mesma dosagem e efeito no sangue.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  dorflex: {
    status: "success",
    commercialName: "Dorflex®",
    activeIngredient: "Dipirona Monoidratada + Citrato de Orfenadrina + Cafeína Anidra",
    dosage: "Comprimido padrão (300mg + 35mg + 50mg)",
    purpose: "Combinação analgésica e relaxante muscular indicada para o alívio de dores de contraturas musculares, dor lombar e cefaleia tensional.",
    howToAsk: "Por favor, você tem o similar equivalente ou genérico de Dipirona com Orfenadrina e Cafeína?",
    tarjaAmarelaInfo: {
      badgeText: "Medicamento Equivalente / Genérico Regulamentado",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "35% a 60%",
      explanation: "A associação relaxante e analgésica possui diversas marcas similares intercambiáveis e genéricos com economia substancial em comparação à marca de referência.",
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Não Coberto no Farmácia Popular",
      instructions: "Relaxantes musculares não constam no rol gratuito federal, mas o genérico garante grande economia direta no caixa da farmácia.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Formulações fiscalizadas rigorosamente pela ANVISA para rápida dissolução e eficácia clínica.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  losartana: {
    status: "success",
    commercialName: "Cozaar® / Aradois® (Losartana)",
    activeIngredient: "Losartana Potássica",
    dosage: "50 mg",
    purpose: "Medicamento anti-hipertensivo que atua dilatando os vasos sanguíneos, diminuindo a pressão arterial e reduzindo os riscos de infarto e AVC.",
    howToAsk: "Por favor, você tem o genérico de Losartana Potássica de 50mg?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "50% a 75%",
      explanation: "A Losartana Potássica genérica é um dos medicamentos mais prescritos do Brasil, custando até 75% a menos com a mesma qualidade fiscalizada pela ANVISA.",
    },
    farmaciaPopular: {
      isEligible: true,
      statusType: "gratuito",
      badgeText: "100% Gratuito pelo SUS (Hipertensão)",
      conditionName: "Hipertensão Arterial (Pressão Alta)",
      instructions: "Totalmente gratuito no Farmácia Popular do Brasil. Apresente receita médica dentro da validade de 180 dias, documento com foto e CPF.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Testes de equivalência terapêutica aprovados na ANVISA, garantindo estabilidade pressórica.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  tylenol: {
    status: "success",
    commercialName: "Tylenol®",
    activeIngredient: "Paracetamol",
    dosage: "750 mg / 500 mg",
    purpose: "Analgésico e antitérmico para o alívio rápido de febre e dores de intensidade leve a moderada (cefaleia, cólicas, dores no corpo).",
    howToAsk: "Por favor, você tem o genérico de Paracetamol de 750mg?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "40% a 65%",
      explanation: "O Paracetamol genérico contém a mesma molécula ativa com poder antipirético e analgésico idêntico ao Tylenol.",
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Não Coberto no Farmácia Popular",
      instructions: "Disponível nas Unidades Básicas de Saúde (Postos do SUS) ou em drogarias particulares com grande economia via genérico tarja amarela.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Fabricado segundo as diretrizes de Boas Práticas de Fabricação auditadas pela ANVISA.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  puran: {
    status: "success",
    commercialName: "Puran T4® / Synthroid®",
    activeIngredient: "Levotiroxina Sódica",
    dosage: "25 mcg / 50 mcg / 100 mcg",
    purpose: "Reposição de hormônio tireoidiano em casos de hipotireoidismo ou após tireoidectomia, normalizando o metabolismo corporal.",
    howToAsk: "Por favor, você tem o genérico ou similar intercambiável de Levotiroxina Sódica na dosagem prescrita?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Tarja Amarela Intercambiável",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "35% a 55%",
      explanation: "A ANVISA mantém lista oficial de medicamentos similares intercambiáveis e genéricos de Levotiroxina com controle rigoroso de biodisponibilidade.",
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Não Coberto no Farmácia Popular",
      instructions: "Pode ser adquirido com desconto em genéricos certificados. Mantenha acompanhamento com seu médico e informe ao farmacêutico caso mude de laboratório.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Controle estrito de teor de princípio ativo para margem terapêutica estreita exigida pela ANVISA.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  aspirina: {
    status: "success",
    commercialName: "Aspirina Prevent® / Aspirina®",
    activeIngredient: "Ácido Acetilsalicílico (AAS)",
    dosage: "100 mg",
    purpose: "Antiagregante plaquetário em baixas doses (100mg) para prevenção de eventos trombóticos cardiovasculares como infarto do miocárdio e AVC.",
    howToAsk: "Por favor, você tem o genérico de Ácido Acetilsalicílico (AAS) de 100mg infantil/prevent?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "45% a 70%",
      explanation: "O AAS genérico de 100mg é amplamente comercializado no Brasil a preços muito acessíveis, com idêntica ação anticoagulante preventiva.",
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Disponível nas UBS / Postos SUS",
      instructions: "Não está no rol do Farmácia Popular em rede privada conveniada, mas é fornecido gratuitamente na rede básica municipal de saúde (UBS) com receita.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Medicamento essencial da Rename (Relação Nacional de Medicamentos Essenciais) certificado pela ANVISA.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  omeprazol: {
    status: "success",
    commercialName: "Losec® / Peprazol® (Omeprazol)",
    activeIngredient: "Omeprazol",
    dosage: "20 mg / 40 mg",
    purpose: "Inibidor da bomba de prótons indicado para o tratamento de gastrite, úlcera péptica, refluxo gastroesofágico e queimação estomacal.",
    howToAsk: "Por favor, você tem o genérico de Omeprazol de 20mg em cápsulas?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "50% a 75%",
      explanation: "O genérico de Omeprazol tem os mesmos testes de dissolução entérica e biodisponibilidade aprovados pela ANVISA por uma fração do preço do Losec.",
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Disponível nas UBS do SUS",
      instructions: "Não integra a lista de co-pagamento da rede privada do Farmácia Popular, mas é distribuído gratuitamente nos postos de saúde (UBS) com receita.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Comprovação de estabilidade gástrica e biodisponibilidade atestada pelos laboratórios credenciados da ANVISA.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  dipirona: {
    status: "success",
    commercialName: "Novalgina® / Anador® (Dipirona Monoidratada)",
    activeIngredient: "Dipirona Monoidratada (Metamizol Sódico)",
    dosage: "500 mg e 1.000 mg (1 g) • Gotas (500 mg/mL)",
    purpose: "Potente analgésico e antipirético de ação rápida. É indicado para aliviar dores moderadas a intensas (como dor de cabeça, enxaqueca, cólicas menstruais, dores musculares e dor de dente) e para controle e redução de febre alta.",
    dosageInfo: "Adultos e jovens acima de 15 anos: 500 mg a 1.000 mg por tomada (1 a 2 comprimidos de 500mg, 1 comprimido de 1g, ou 20 a 40 gotas em água), com intervalo mínimo de 6 horas entre as doses. Dose máxima permitida: 4.000 mg (4 g) ao dia.",
    howToAsk: "Por favor, você tem a Dipirona genérica de 500mg (ou 1g) com a tarja amarela?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "50% a 70%",
      explanation: "A Dipirona genérica possui a mesma biodisponibilidade e pureza da Novalgina® comprovadas pela ANVISA, custando em média R$ 4 a R$ 8 na drogaria (contra R$ 28 a R$ 35 da marca de referência).",
    },
    susAvailability: {
      isFreeInSUS: true,
      badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS (RENAME)",
      instructions: "Consta na Relação Nacional de Medicamentos Essenciais (RENAME) e é distribuída 100% de graça em qualquer Unidade Básica de Saúde (UBS / Posto de Saúde) do Brasil portando o Cartão SUS e documento com foto.",
      requiresPrescription: false,
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Disponível gratuitamente nas UBS municipais",
      conditionName: "Dor e Febre (Atenção Básica)",
      instructions: "Não integra a lista de farmácias privadas conveniadas do Farmácia Popular, mas é fornecida de graça em todos os postos de saúde públicos e custa poucos reais na drogaria.",
    },
    precautions: "Contraindicações e Cuidados: Contraindicada para quem possui alergia a pirazolonas ou histórico de agranulocitose. Cautela em pessoas com pressão baixa (hipotensão). Gestantes nos primeiros 3 meses e no último trimestre de gravidez devem evitar sem orientação médica prévia.",
    equivalentMedicines: [
      {
        type: "generico",
        name: "Dipirona Monoidratada 500mg / 1g (Genérico)",
        activeIngredient: "Dipirona Monoidratada",
        dosage: "500 mg / 1 g (Gotas ou Comprimidos)",
        badge: "Tarja Amarela ANVISA",
        savingsEstimated: "Economia de até 70%",
        description: "Genérico oficial com a letra G e tarja amarela. Custa entre R$ 4 e R$ 8.",
        recommended: true,
      },
      {
        type: "referencia",
        name: "Novalgina® 500mg / 1g (Sanofi)",
        activeIngredient: "Dipirona Monoidratada",
        dosage: "500 mg / 1 g",
        badge: "Marca de Referência",
        savingsEstimated: "Preço de Referência (~R$ 28)",
        description: "Marca original pioneira da Sanofi. Mesma substância que o genérico.",
        recommended: false,
      },
      {
        type: "referencia",
        name: "Anador® (Boehringer Ingelheim)",
        activeIngredient: "Dipirona Monoidratada",
        dosage: "500 mg",
        badge: "Marca Tradicional",
        savingsEstimated: "Preço de Referência (~R$ 22)",
        description: "Outra marca consagrada no mercado farmacêutico brasileiro.",
        recommended: false,
      },
      {
        type: "similar_intercambiavel",
        name: "Doralgina® / Lisador® (Fórmulas Combinadas)",
        activeIngredient: "Dipirona + Cafeína / Antiespasmódicos",
        dosage: "Comprimidos / Gotas",
        badge: "Similar Combinado",
        savingsEstimated: "Custo Intermediário",
        description: "Associações analgésicas para enxaqueca tensional ou cólicas.",
        recommended: false,
      },
    ],
    quickTips: [
      "Pode ser ingerida com ou sem alimentos. Tome com um copo d'água.",
      "Ação rápida: o alívio da dor e da febre normalmente se inicia entre 30 e 60 minutos após a tomada.",
      "A apresentação em gotas (500mg/mL) permite dosagem fracionada e é mais fácil para quem tem dificuldade em engolir comprimidos grandes.",
    ],
    anvisaRegulation: {
      bioequivalent: true,
      details: "Medicamento essencial previsto na RENAME, fabricado sob as mais rígidas Boas Práticas de Fabricação (BPF) auditadas pela ANVISA.",
    },
    disclaimer: "Aviso importante: Esta informação tem finalidade estritamente educativa. Nunca ultrapasse a dosagem máxima diária e consulte sempre o farmacêutico ou médico se os sintomas persistirem.",
  },
  sinvastatina: {
    status: "success",
    commercialName: "Zocor® (Sinvastatina)",
    activeIngredient: "Sinvastatina",
    dosage: "20 mg / 40 mg",
    purpose: "Redutor de colesterol total e triglicerídeos, prevenindo aterosclerose, infarto e derrames.",
    howToAsk: "Por favor, você tem o genérico de Sinvastatina de 20mg pelo Farmácia Popular?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "50% a 75%",
      explanation: "A Sinvastatina genérica possui comprovada eficácia na redução de LDL com o mesmo perfil de segurança do medicamento de referência.",
    },
    farmaciaPopular: {
      isEligible: true,
      statusType: "copagamento",
      badgeText: "Programa Farmácia Popular (Desconto até 90%)",
      conditionName: "Dislipidemia (Colesterol Alto)",
      instructions: "Participa do Programa Farmácia Popular com subsídio do Ministério da Saúde de até 90% (e 100% gratuito para beneficiários do Bolsa Família). Apresente receita médica e CPF.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Bioequivalência testada e aprovada pela ANVISA.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  atenolol: {
    status: "success",
    commercialName: "Atenol® (Atenolol)",
    activeIngredient: "Atenolol",
    dosage: "50 mg / 100 mg",
    purpose: "Anti-hipertensivo betabloqueador que reduz a frequência cardíaca e a pressão arterial, indicado para hipertensão e angina.",
    howToAsk: "Por favor, você tem o genérico de Atenolol 50mg pelo Farmácia Popular gratuito?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "50% a 70%",
      explanation: "O Atenolol genérico atua com a mesma precisão cronotrópica e anti-hipertensiva do Atenol de marca.",
    },
    farmaciaPopular: {
      isEligible: true,
      statusType: "gratuito",
      badgeText: "100% Gratuito pelo SUS (Hipertensão)",
      conditionName: "Hipertensão Arterial",
      instructions: "100% gratuito pelo Farmácia Popular em qualquer drogaria credenciada. Basta levar receita médica válida (até 180 dias) e CPF.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Equivalência terapêutica certificada pela ANVISA.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  enalapril: {
    status: "success",
    commercialName: "Renitec® (Maleato de Enalapril)",
    activeIngredient: "Maleato de Enalapril",
    dosage: "10 mg / 20 mg",
    purpose: "Inibidor da ECA para controle da pressão arterial alta e insuficiência cardíaca congestiva.",
    howToAsk: "Por favor, você tem o genérico de Maleato de Enalapril 10mg ou 20mg pelo Farmácia Popular?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "45% a 70%",
      explanation: "Idêntica biodisponibilidade do Renitec, promovendo vasodilatação e proteção cardiovascular.",
    },
    farmaciaPopular: {
      isEligible: true,
      statusType: "gratuito",
      badgeText: "100% Gratuito pelo SUS (Hipertensão)",
      conditionName: "Hipertensão Arterial",
      instructions: "100% gratuito no Farmácia Popular do Brasil. Exige receita médica dentro do prazo de 180 dias e documento oficial com foto e CPF.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Aprovado pela ANVISA em ensaios farmacocinéticos rigorosos.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  hidroclorotiazida: {
    status: "success",
    commercialName: "Clorana® (Hidroclorotiazida)",
    activeIngredient: "Hidroclorotiazida",
    dosage: "25 mg",
    purpose: "Diurético tiazídico para diminuição da retenção hídrica e controle da hipertensão arterial.",
    howToAsk: "Por favor, você tem o genérico de Hidroclorotiazida 25mg gratuito pelo Farmácia Popular?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "50% a 75%",
      explanation: "Medicamento genérico padrão com controle de qualidade e eficácia diurética assegurada pela ANVISA.",
    },
    farmaciaPopular: {
      isEligible: true,
      statusType: "gratuito",
      badgeText: "100% Gratuito pelo SUS (Hipertensão)",
      conditionName: "Hipertensão Arterial",
      instructions: "Gratuidade total garantida pelo Ministério da Saúde em farmácias conveniadas ao Farmácia Popular.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Padrão de referência ANVISA com eficácia clínica demonstrada.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  salbutamol: {
    status: "success",
    commercialName: "Aerolin® Spray (Salbutamol)",
    activeIngredient: "Sulfato de Salbutamol",
    dosage: "100 mcg/dose",
    purpose: "Broncodilatador de ação rápida para alívio imediato e prevenção do broncoespasmo na asma e bronquite crônica.",
    howToAsk: "Por favor, você tem o Salbutamol spray (ou similar intercambiável) pelo Farmácia Popular gratuito?",
    tarjaAmarelaInfo: {
      badgeText: "Medicamento Genérico / Similar Aprovado",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "100% Gratuito pelo SUS",
      explanation: "O Salbutamol em aerossol dosimetrado garante rápida abertura das vias aéreas com a mesma dose por jato liberado.",
    },
    farmaciaPopular: {
      isEligible: true,
      statusType: "gratuito",
      badgeText: "100% Gratuito pelo SUS (Asma)",
      conditionName: "Asma e Bronquite",
      instructions: "Totalmente gratuito no Farmácia Popular. Apresente receita médica indicando o uso de broncodilatador aerossol e documento com CPF.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Padrão aerossol verificado nos ensaios de uniformidade de dose liberada da ANVISA.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  amoxicilina: {
    status: "success",
    commercialName: "Amoxil® (Amoxicilina)",
    activeIngredient: "Amoxicilina Tri-hidratada",
    dosage: "500 mg / 875 mg",
    purpose: "Antibiótico da família das penicilinas para infecções respiratórias (sinusite, amigdalite), urinárias e cutâneas.",
    howToAsk: "Por favor, você tem o genérico de Amoxicilina de 500mg? (Receita em duas vias)",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial Tarja Vermelha com Letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999 e RDC nº 20/2011",
      savingsPercentRange: "40% a 65%",
      explanation: "Antibiótico com bioequivalência comprovada pela ANVISA. Requer retenção da 2ª via da receita médica na farmácia.",
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Disponível gratuitamente nas UBS do SUS",
      instructions: "Não integra a rede privada conveniada do Farmácia Popular, mas é fornecido gratuitamente na farmácia dos postos de saúde (UBS) do SUS com receita válida.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Controle especial sob RDC 20/2011 e biodisponibilidade certificada pela ANVISA.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  ibuprofeno: {
    status: "success",
    commercialName: "Alivium® / Advil® (Ibuprofeno)",
    activeIngredient: "Ibuprofeno",
    dosage: "400 mg / 600 mg",
    purpose: "Anti-inflamatório não esteroidal (AINE), analgésico e antitérmico para dores de garganta, dentárias, cólicas e inflamações articulares.",
    howToAsk: "Por favor, você tem o genérico de Ibuprofeno de 600mg?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "40% a 65%",
      explanation: "O Ibuprofeno genérico tem absorção e taxa de alívio inflamatório rigorosamente equivalentes às grandes marcas.",
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Disponível nas UBS do SUS",
      instructions: "Disponível gratuitamente na assistência farmacêutica municipal do SUS ou como genérico muito barato em drogarias privadas.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Testes de pureza e eficácia terapêutica auditados pela ANVISA.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  loratadina: {
    status: "success",
    commercialName: "Claritin® (Loratadina)",
    activeIngredient: "Loratadina",
    dosage: "10 mg",
    purpose: "Anti-histamínico de segunda geração que combate sintomas de rinite alérgica, espirros, coriza e coceiras na pele sem causar sonolência marcante.",
    howToAsk: "Por favor, você tem o genérico de Loratadina 10mg em comprimidos?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "45% a 70%",
      explanation: "A Loratadina genérica possui idêntica ação antialérgica de alívio duradouro por 24 horas a custo muito menor que o Claritin.",
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Disponível nas UBS do SUS",
      instructions: "Fornecido de graça nas UBS municipais do SUS ou com forte desconto em genéricos nas farmácias comunitárias.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Conformidade com a Farmacopeia Brasileira e registro ativo na ANVISA.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  ciprofloxacino: {
    status: "success",
    commercialName: "Cipro® (Cloridrato de Ciprofloxacino)",
    activeIngredient: "Cloridrato de Ciprofloxacino",
    dosage: "500 mg",
    purpose: "Antibiótico fluoroquinolona de amplo espectro para infecções urinárias graves, gastrintestinais e respiratórias.",
    howToAsk: "Por favor, você tem o genérico do Cloridrato de Ciprofloxacino de 500mg com retenção de receita?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial Tarja Vermelha com Letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "45% a 70%",
      explanation: "Equivalência e biodisponibilidade comprovadas pela ANVISA, custando substancialmente menos.",
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Disponível nas farmácias do SUS",
      instructions: "Não está no convênio privado do Farmácia Popular; retirável sem custos nas farmácias municipais do SUS com receita em duas vias.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Estudos de equivalência in vitro e in vivo auditados e homologados pela ANVISA.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  fluconazol: {
    status: "success",
    commercialName: "Zoltec® (Fluconazol)",
    activeIngredient: "Fluconazol",
    dosage: "150 mg",
    purpose: "Antifúngico potente para candidíase vaginal, micoses cutâneas e infecções fúngicas sistêmicas.",
    howToAsk: "Por favor, você tem o genérico de Fluconazol 150mg em cápsula única?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "50% a 75%",
      explanation: "O Fluconazol genérico tem a mesma eficácia antifúngica do Zoltec a preços extremamente populares.",
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Disponível na rede básica SUS",
      instructions: "Disponível nos postos de saúde do SUS ou vendido como genérico de baixíssimo custo no comércio particular.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Biodisponibilidade e perfil de liberação atestados pela ANVISA.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  sertralina: {
    status: "success",
    commercialName: "Zoloft® / Tolrest® (Sertralina)",
    activeIngredient: "Cloridrato de Sertralina",
    dosage: "50 mg",
    purpose: "Antidepressivo inibidor seletivo da recaptação de serotonina (ISRS) para depressão, transtornos de ansiedade e pânico.",
    howToAsk: "Por favor, você tem o genérico de Cloridrato de Sertralina de 50mg? (Receita de controle especial C1)",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial Tarja Vermelha com Letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999 e Portaria SVS/MS 344/98",
      savingsPercentRange: "50% a 70%",
      explanation: "A Sertralina genérica oferece a mesma estabilidade neuroquímica e segurança terapêutica com grande economia no tratamento contínuo.",
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Não Coberto no Farmácia Popular",
      instructions: "Psicotrópicos não constam no Farmácia Popular em drogarias privadas, mas podem ser dispensados na farmácia de saúde mental/CAPS do SUS ou comprados como genérico.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Medicamento sob controle especial da ANVISA com bioequivalência aprovada.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  clonazepam: {
    status: "success",
    commercialName: "Rivotril® (Clonazepam)",
    activeIngredient: "Clonazepam",
    dosage: "2 mg / 0,5 mg",
    purpose: "Ansiolítico e anticonvulsivante benzodiazepínico para crises de pânico, ansiedade grave e epilepsia.",
    howToAsk: "Por favor, você tem o genérico de Clonazepam de 2mg ou gotas? (Notificação de Receita B azul)",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial Tarja Preta com Letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999 e Portaria 344/98",
      savingsPercentRange: "40% a 65%",
      explanation: "O Clonazepam genérico possui idêntica ação gabaérgica central regulamentada pela ANVISA.",
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Disponível nas farmácias do SUS",
      instructions: "Requer receita azul do tipo B. Fornecido na rede de assistência farmacêutica do SUS ou comprado com desconto em drogarias privadas.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Controle estrito de fabricação e liberação pela ANVISA.",
    },
    disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações.",
  },
  luftal: {
    status: "success",
    commercialName: "Luftal® / Flagass®",
    activeIngredient: "Simeticona (Dimeticona ativada)",
    dosage: "40 mg (comprimidos) • 75 mg/mL ou 125 mg/mL (Gotas)",
    purpose: "Antiflatulento e antigases de alívio rápido. Age rompendo as bolhas de ar retidas no estômago e nos intestinos, eliminando a sensação de estufamento abdominal, inchaço na barriga, dor e cólicas causadas por excesso de gases e flatulência pós-refeição.",
    dosageInfo: "Adultos: 40 mg (1 comprimido) ou 40 a 125 mg em gotas diluídas em água, 3 a 4 vezes ao dia após as principais refeições e antes de deitar. Crianças e bebês: Gotas conforme o peso corporal e orientação do pediatra (habitualmente 3 a 5 gotas até 3x ao dia).",
    precautions: "Contraindicado em casos de suspeita de perfuração ou obstrução intestinal, dor abdominal aguda de causa desconhecida ou alergia aos componentes da fórmula.",
    howToAsk: "Por favor, você tem a Simeticona genérica com a tarja amarela (gotas ou comprimidos)?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "50% a 75%",
      explanation: "A Simeticona genérica possui rigorosamente a mesma molécula antiflatulenta do Luftal, custando em média R$ 5 a R$ 9 (contra R$ 22 a R$ 28 da marca de referência).",
    },
    susAvailability: {
      isFreeInSUS: true,
      badgeText: "🟢 Gratuito na Farmácia Básica do SUS (UBS)",
      instructions: "Disponível nas Unidades Básicas de Saúde (UBS) do SUS para queixas de distensão abdominal e gases intestinais.",
      requiresPrescription: false,
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Disponível na UBS ou genérico muito barato",
      conditionName: "Gastrointestinal (Gases)",
      instructions: "Antiflatulentos não constam no rol privado do Farmácia Popular, mas são fornecidos na rede pública municipal (UBS) e vendidos a custo muito reduzido como genéricos.",
    },
    equivalentMedicines: [
      {
        type: "generico",
        name: "Simeticona 40mg / 125mg / Gotas (Genérico)",
        activeIngredient: "Simeticona",
        dosage: "Comprimidos ou Gotas",
        badge: "Tarja Amarela ANVISA",
        savingsEstimated: "Economia de até 70%",
        description: "Genérico oficial com tarja amarela. Custa entre R$ 5 e R$ 9 na drogaria.",
        recommended: true,
      },
      {
        type: "referencia",
        name: "Luftal® (Reckitt Benckiser)",
        activeIngredient: "Simeticona",
        dosage: "40 mg / Gotas",
        badge: "Marca Pioneira",
        savingsEstimated: "Preço de Referência (~R$ 24)",
        description: "Marca de referência tradicional no mercado brasileiro.",
        recommended: false,
      },
      {
        type: "similar_intercambiavel",
        name: "Flagass® (Aché) / Luftal Max®",
        activeIngredient: "Simeticona",
        dosage: "125 mg cápsula gelatinosa",
        badge: "Similar Aprovado",
        savingsEstimated: "Economia de 30% a 50%",
        description: "Apresentação em cápsula gelatinosa mole de rápida ação.",
        recommended: false,
      },
    ],
    quickTips: [
      "Pode ser ingerido logo após as refeições ou ao se deitar se houver sensação de estufamento.",
      "Não é absorvido pelo sangue: atua exclusivamente em contato com o conteúdo gasoso do trato digestivo e é eliminado intacto pelas fezes.",
      "Evite refrigerantes gaseificados e mastigar chicletes para reduzir o engolimento de ar.",
    ],
    anvisaRegulation: {
      bioequivalent: true,
      details: "Princípio ativo consagrado na farmacopeia brasileira e fiscalizado pela ANVISA.",
    },
    disclaimer: "Aviso importante: Se a dor abdominal for muito aguda, com vômitos frequentes ou febre, procure uma UPA imediatamente.",
  },
  buscopan: {
    status: "success",
    commercialName: "Buscopan® / Buscopan Composto®",
    activeIngredient: "Butilbrometo de Escopolamina (+ Dipirona)",
    dosage: "10 mg (Simples) • 10 mg + 250 mg (Composto) Gotas ou Comprimidos",
    purpose: "Antiespasmódico e analgésico potente. Indicado para o alívio rápido de cólicas menstruais intensas, dores e cólicas no estômago, intestino, vesícula e trato urinário, relaxando os músculos em contração dolorosa.",
    dosageInfo: "Adultos: 1 a 2 comprimidos ou 20 a 40 gotas, 3 a 4 vezes ao dia. Não ultrapassar 8 comprimidos ao dia.",
    precautions: "Contraindicado em pessoas com glaucoma de ângulo fechado, aumento da próstata, miastenia grave ou alergia à dipirona (na versão composta).",
    howToAsk: "Por favor, você tem o genérico de Butilbrometo de Escopolamina com Dipirona?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "45% a 70%",
      explanation: "A Escopolamina genérica simples ou combinada possui o mesmo relaxamento antiespasmódico com economia de até 70%.",
    },
    susAvailability: {
      isFreeInSUS: true,
      badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
      instructions: "Distribuído gratuitamente em todas as UBS do Brasil para alívio de cólicas.",
      requiresPrescription: false,
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Gratuito nas UBS do SUS",
      conditionName: "Gastrointestinal e Cólicas",
      instructions: "Fornecido gratuitamente na rede pública municipal (UBS).",
    },
    equivalentMedicines: [
      {
        type: "generico",
        name: "Butilbrometo de Escopolamina + Dipirona (Genérico)",
        activeIngredient: "Escopolamina + Dipirona",
        dosage: "Comprimidos / Gotas",
        badge: "Tarja Amarela ANVISA",
        savingsEstimated: "Economia de até 65%",
        description: "Versão genérica com tarja amarela e mesma eficácia.",
        recommended: true,
      },
      {
        type: "referencia",
        name: "Buscopan Composto® (Boehringer)",
        activeIngredient: "Escopolamina + Dipirona",
        dosage: "Drágeas / Gotas",
        badge: "Marca de Referência",
        savingsEstimated: "Preço de Referência",
        description: "Marca original tradicional para cólicas.",
        recommended: false,
      },
    ],
    quickTips: [
      "Tome com um pouco de água ao primeiro sinal de contração ou cólica dolorosa.",
      "Pode causar sensação de boca seca passageira.",
    ],
    anvisaRegulation: {
      bioequivalent: true,
      details: "Biodisponibilidade e ação antiespasmódica certificadas pela ANVISA.",
    },
    disclaimer: "Aviso importante: Se a dor for contínua, intensa ou vier acompanhada de febre, procure atendimento médico imediato.",
  },
  neosaldina: {
    status: "success",
    commercialName: "Neosaldina® (Neosa)",
    activeIngredient: "Dipirona + Mucato de Isometepteno + Cafeína",
    dosage: "Drágeas (300mg + 30mg + 30mg) • Gotas",
    purpose: "Analgésico e antiespasmódico vascular craniano específico para o alívio rápido de dores de cabeça tensionais, cefaleia e crises de enxaqueca moderada.",
    dosageInfo: "Adultos: 1 a 2 drágeas a cada 6 horas se houver dor. Dose máxima: 8 drágeas ao dia.",
    precautions: "Contraindicado em pessoas com hipertensão descontrolada ou alergia à dipirona.",
    howToAsk: "Por favor, você tem o similar genérico da fórmula da Neosaldina com tarja amarela?",
    tarjaAmarelaInfo: {
      badgeText: "Medicamento Equivalente / Genérico",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "40% a 65%",
      explanation: "A associação analgésica e vasoconstritora craniana possui versões genéricas e similares muito econômicas.",
    },
    susAvailability: {
      isFreeInSUS: false,
      badgeText: "⚪ Genérico Econômico na Drogaria",
      instructions: "Não está no rol do SUS, mas versões como Doralgina ou Sedalex custam metade do preço.",
      requiresPrescription: false,
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Venda Livre na Farmácia",
      instructions: "Pode ser adquirido diretamente no balcão da farmácia particular com grande economia em genéricos.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Padrão analgésico fiscalizado e certificado pela ANVISA.",
    },
    disclaimer: "Aviso importante: Dores de cabeça repentinas de intensidade extrema exigem atendimento médico imediato na UPA.",
  },
  nimesulida: {
    status: "success",
    commercialName: "Scaflam® / Nisulid® (Nimesulida)",
    activeIngredient: "Nimesulida",
    dosage: "100 mg (comprimidos) • Gotas 50 mg/mL",
    purpose: "Anti-inflamatório não esteroidal (AINE) e analgésico potente. Indicado para inflamações agudas intensas, dor de dente, inflamação de garganta, dores musculares, sinusite aguda e artrite.",
    dosageInfo: "Adultos: 1 comprimido de 100 mg a cada 12 horas (2 vezes ao dia) sempre após as refeições. Uso máximo recomendado de 5 a 7 dias.",
    precautions: "Contraindicado em casos de úlcera gástrica ativa, hemorragia digestiva, insuficiência hepática ou renal grave e gravidez.",
    howToAsk: "Por favor, você tem a Nimesulida genérica de 100mg com a tarja amarela?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial Tarja Vermelha com Letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "50% a 75%",
      explanation: "A Nimesulida genérica custa entre R$ 4 e R$ 8 na drogaria com idêntica eficácia anti-inflamatória.",
    },
    susAvailability: {
      isFreeInSUS: true,
      badgeText: "🟢 Gratuito no Posto de Saúde / UBS",
      instructions: "Disponível na assistência farmacêutica municipal do SUS com apresentação de receita médica.",
      requiresPrescription: true,
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Disponível nas UBS do SUS",
      instructions: "Retirável de graça na farmácia da UBS portando receita e Cartão SUS.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Bioequivalência comprovada pela ANVISA.",
    },
    disclaimer: "Aviso importante: Não utilize por períodos prolongados para proteger o fígado e os rins.",
  },
  diclofenaco: {
    status: "success",
    commercialName: "Cataflam® / Voltaren® (Diclofenaco)",
    activeIngredient: "Diclofenaco Potássico ou Diclofenaco Sódico",
    dosage: "50 mg / 75 mg / 100 mg",
    purpose: "Anti-inflamatório potente, analgésico e antirreumático. Indicado para crises de dor na coluna (lombalgia), torcicolo, dor pós-traumática, entorses, contusões e crises de gota ou artrite.",
    dosageInfo: "Adultos: 50 mg de 8 em 8 horas ou 75 mg a cada 12 horas, sempre após ingerir alimentos para proteger a mucosa gástrica.",
    precautions: "Contraindicado para pacientes com úlcera péptica ativa, histórico de infarto recente ou insuficiência cardíaca severa.",
    howToAsk: "Por favor, você tem o Diclofenaco genérico de 50mg com tarja amarela?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "45% a 70%",
      explanation: "Economia média de 60% com a mesma resposta anti-inflamatória verificada pela ANVISA.",
    },
    susAvailability: {
      isFreeInSUS: true,
      badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
      instructions: "Medicamento básico do SUS fornecido gratuitamente nas UBS.",
      requiresPrescription: false,
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Disponível no posto de saúde do SUS",
      instructions: "Disponível sem custo nas UBS com Cartão SUS.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Conformidade total com a Farmacopeia Brasileira e registro na ANVISA.",
    },
    disclaimer: "Aviso importante: Beba bastante água durante o tratamento e não tome com o estômago vazio.",
  },
  dramin: {
    status: "success",
    commercialName: "Dramin® / Dramin B6®",
    activeIngredient: "Dimenidrinato + Cloridrato de Piridoxina (Vitamina B6)",
    dosage: "Comprimidos (50mg + 10mg) • Gotas",
    purpose: "Antiemético e antivertiginoso. Indicado para prevenção e alívio de náuseas, enjoos e vômitos causados por viagens (cinetose em carros, barcos ou aviões), labirintite e tonturas.",
    dosageInfo: "Adultos: 1 comprimido 30 minutos a 1 hora antes de iniciar viagens, repetindo a cada 4 a 6 horas se necessário. Dose máxima: 400 mg ao dia.",
    precautions: "Causa sonolência marcante. Não dirija veículos nem opere máquinas após o uso. Evite ingerir com álcool.",
    howToAsk: "Por favor, você tem o genérico de Dimenidrinato com Vitamina B6?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "40% a 65%",
      explanation: "O Dimenidrinato genérico possui o mesmo efeito contra tonturas e enjoos por um terço do preço de marca.",
    },
    susAvailability: {
      isFreeInSUS: true,
      badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
      instructions: "Consta no elenco da atenção básica do SUS e é distribuído gratuitamente nos postos de saúde.",
      requiresPrescription: false,
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Gratuito nas UBS do SUS",
      instructions: "Disponível na farmácia da UBS do seu município.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Atestado de bioequivalência e controle da ANVISA.",
    },
    disclaimer: "Aviso importante: Se os vômitos forem incontroláveis e impedirem a hidratação, vá à UPA para medicação venosa.",
  },
  plasil: {
    status: "success",
    commercialName: "Plasil® (Cloridrato de Metoclopramida)",
    activeIngredient: "Cloridrato de Metoclopramida",
    dosage: "10 mg (comprimidos) • Gotas 4 mg/mL",
    purpose: "Antiemético e pró-cinético gastrintestinal. Acelera o esvaziamento do estômago, combatendo náuseas, vômitos, sensação de empachamento, refluxo e má digestão.",
    dosageInfo: "Adultos: 10 mg (1 comprimido) 3 vezes ao dia, 30 minutos antes das refeições.",
    precautions: "Contraindicado em casos de sangramento intestinal, perfuração gastrintestinal ou histórico de crises convulsivas.",
    howToAsk: "Por favor, você tem o genérico de Cloridrato de Metoclopramida 10mg?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial Tarja Vermelha com Letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "45% a 70%",
      explanation: "A Metoclopramida genérica custa poucos reais na drogaria com a mesma ação de alívio gástrico.",
    },
    susAvailability: {
      isFreeInSUS: true,
      badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
      instructions: "Disponível nas Unidades Básicas de Saúde do SUS.",
      requiresPrescription: false,
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Disponível gratuitamente no SUS",
      instructions: "Retirável na farmácia básica do SUS.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Medicamento auditado pelas Boas Práticas da ANVISA.",
    },
    disclaimer: "Aviso importante: Evite dirigir caso sinta sonolência ou inquietude motora.",
  },
  pantoprazol: {
    status: "success",
    commercialName: "Pantozol® (Pantoprazol)",
    activeIngredient: "Pantoprazol Sódico Sesqui-hidratado",
    dosage: "20 mg / 40 mg",
    purpose: "Inibidor potente da bomba de prótons. Reduz a produção ácida no estômago para tratamento de esofagite de refluxo, gastrite crônica, úlceras gástricas e duodenais e sensação de queimação no peito.",
    dosageInfo: "Adultos: 1 comprimido de 20 mg ou 40 mg pela manhã em jejum, 30 minutos antes do café da manhã. Ingerir inteiro com água sem mastigar.",
    precautions: "Não mastigar ou triturar os comprimidos revestidos. Uso prolongado acima de 1 ano deve ser acompanhado por médico.",
    howToAsk: "Por favor, você tem o genérico de Pantoprazol 40mg com tarja amarela?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "50% a 75%",
      explanation: "O Pantoprazol genérico oferece proteção gástrica rigorosamente idêntica ao Pantozol de marca com economia expressiva.",
    },
    susAvailability: {
      isFreeInSUS: true,
      badgeText: "🟢 Gratuito na Farmácia do SUS (UBS)",
      instructions: "Fornecido gratuitamente em diversas UBS municipais mediante receita médica válida.",
      requiresPrescription: true,
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Disponível no SUS ou genérico barato",
      instructions: "Vendido com preços muito populares na versão genérica com tarja amarela.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Estudos de dissolução gástrica e biodisponibilidade aprovados pela ANVISA.",
    },
    disclaimer: "Aviso importante: Em caso de vômitos escuros com aspecto de borra de café ou fezes pretas, procure a emergência imediatamente.",
  },
  allegra: {
    status: "success",
    commercialName: "Allegra® (Fexofenadina)",
    activeIngredient: "Cloridrato de Fexofenadina",
    dosage: "120 mg / 180 mg",
    purpose: "Antialérgico moderno de última geração que NÃO causa sonolência. Indicado para o alívio rápido e duradouro de sintomas de rinite alérgica (espirros frequentes, coriza aquosa, coceira no nariz e olhos lacrimejantes) e urticária na pele.",
    dosageInfo: "Adultos e jovens a partir de 12 anos: 1 comprimido ao dia (120 mg para rinite ou 180 mg para urticária), ingerido com água. Alívio por 24 horas.",
    precautions: "Evite tomar junto com sucos de frutas cítricas (laranja, maçã ou toranja), pois reduzem a absorção do medicamento.",
    howToAsk: "Por favor, você tem o genérico de Cloridrato de Fexofenadina 120mg ou 180mg?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "45% a 70%",
      explanation: "A Fexofenadina genérica oferece a mesma eficácia antialérgica de longa ação do Allegra por um preço muito menor.",
    },
    susAvailability: {
      isFreeInSUS: false,
      badgeText: "⚪ Genérico Acessível na Drogaria",
      instructions: "Não integra o rol gratuito universal do SUS (que distribui Loratadina), mas tem versões genéricas baratas nas farmácias.",
      requiresPrescription: false,
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Venda Livre com Tarja Amarela",
      instructions: "Adquirível diretamente nas drogarias particulares sem retenção de receita.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Testado e aprovado pela ANVISA em parâmetros internacionais.",
    },
    disclaimer: "Aviso importante: Se apresentar inchaço na boca, língua ou falta de ar, busque socorro imediato por risco de anafilaxia.",
  },
  torsilax: {
    status: "success",
    commercialName: "Torsilax® / Tandrilax®",
    activeIngredient: "Diclofenaco Sódico + Paracetamol + Carisoprodol + Cafeína",
    dosage: "Comprimidos (50mg + 300mg + 125mg + 30mg)",
    purpose: "Relaxante muscular, anti-inflamatório e analgésico combinado de alta potência. Indicado para o tratamento de contraturas musculares dolorosas agudas, crise de coluna travada (lombalgia severa), torcicolo, artrite e tendinite.",
    dosageInfo: "Adultos: 1 comprimido a cada 12 horas ou 8 horas (conforme intensidade da dor), sempre após refeições. Não exceder 3 comprimidos ao dia nem mais de 5 dias seguidos.",
    precautions: "Contraindicado em pessoas com histórico de úlcera gástrica, sangramentos, pressão alta descontrolada ou insuficiência renal e hepática.",
    howToAsk: "Por favor, você tem o similar genérico da fórmula do Torsilax / Tandrilax?",
    tarjaAmarelaInfo: {
      badgeText: "Medicamento Equivalente / Genérico",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "40% a 65%",
      explanation: "A associação relaxante e anti-inflamatória é amplamente produzida por laboratórios certificados pela ANVISA a preços reduzidos.",
    },
    susAvailability: {
      isFreeInSUS: false,
      badgeText: "⚪ Genérico Barato na Farmácia",
      instructions: "No SUS, os componentes são fornecidos separadamente (Paracetamol e Diclofenaco gratuitos na UBS).",
      requiresPrescription: false,
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Disponível nas drogarias",
      instructions: "Adquirível nas drogarias particulares a custo baixo.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Formulação aprovada pela ANVISA.",
    },
    disclaimer: "Aviso importante: Tome sempre acompanhado de alimento para evitar irritação no estômago.",
  },
  azitromicina: {
    status: "success",
    commercialName: "Zitromax® / Astro® (Azitromicina)",
    activeIngredient: "Azitromicina Di-hidratada",
    dosage: "500 mg (caixa com 3 ou 5 comprimidos)",
    purpose: "Antibiótico macrolídeo de amplo espectro com ação prolongada nos tecidos. Indicado para infecções respiratórias superiores e inferiores (sinusite bacteriana aguda, amigdalite, bronquite, pneumonia), infecções de pele e infecções sexualmente transmissíveis (clamídia).",
    dosageInfo: "Adultos: 1 comprimido de 500 mg uma vez ao dia, tomado 1 hora antes ou 2 horas após refeições, durante 3 ou 5 dias consecutivos conforme prescrição médica.",
    precautions: "Antibiótico com retenção obrigatória de receita na farmácia. Tome sempre nos mesmos horários e complete todo o ciclo prescrito mesmo se melhorar antes.",
    howToAsk: "Por favor, você tem a Azitromicina genérica de 500mg com tarja amarela? (Receita médica em duas vias)",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial Tarja Vermelha com Letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999 e RDC nº 20/2011",
      savingsPercentRange: "45% a 70%",
      explanation: "A Azitromicina genérica possui a mesma absorção e poder bactericida que as marcas originais.",
    },
    susAvailability: {
      isFreeInSUS: true,
      badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS (SUS)",
      instructions: "Fornecida sem nenhum custo nas farmácias municipais das UBS do SUS mediante apresentação de receita médica válida.",
      requiresPrescription: true,
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Disponível gratuitamente nas UBS do SUS",
      instructions: "Disponível na rede pública de saúde.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Comprovação microbiológica e ensaios de bioequivalência aprovados pela ANVISA.",
    },
    disclaimer: "Aviso importante: O uso incorreto ou incompleto de antibióticos gera superbactérias resistentes. Cumpra os dias prescritos.",
  },
  albendazol: {
    status: "success",
    commercialName: "Zentel® (Albendazol)",
    activeIngredient: "Albendazol",
    dosage: "400 mg (comprimido mastigável ou suspensão oral)",
    purpose: "Antiparasitário e vermífugo de largo espectro. Indicado para a eliminação de vermes intestinais comuns como lombriga (Ascaris lumbricoides), ancilóstomo, oxiúro, estrongiloide e tênia.",
    dosageInfo: "Adultos e crianças acima de 2 anos: 400 mg em dose única (1 comprimido mastigado ou 10 mL de suspensão) administrado com uma refeição rica em gordura para melhor absorção.",
    precautions: "Totalmente contraindicado em mulheres grávidas ou com suspeita de gravidez e durante o período de amamentação.",
    howToAsk: "Por favor, você tem o genérico de Albendazol 400mg mastigável com tarja amarela?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "50% a 75%",
      explanation: "O Albendazol genérico custa em média R$ 3 a R$ 6 na farmácia e possui ação vermífuga idêntica à do Zentel.",
    },
    susAvailability: {
      isFreeInSUS: true,
      badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
      instructions: "Item fundamental do programa de controle de parasitoses do SUS distribuído gratuitamente nas UBS.",
      requiresPrescription: false,
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Disponível gratuitamente nas UBS",
      instructions: "Retirável sem custo em qualquer posto de saúde portando Cartão SUS.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Medicamento essencial do SUS auditado pela ANVISA.",
    },
    disclaimer: "Aviso importante: Em caso de parasitoses graves com perda de peso ou sangue nas fezes, consulte um clínico na UBS.",
  },
  captopril: {
    status: "success",
    commercialName: "Capoten® (Captopril)",
    activeIngredient: "Captopril",
    dosage: "25 mg / 50 mg",
    purpose: "Anti-hipertensivo inibidor da ECA. Indicado para o controle da pressão arterial alta (hipertensão) e tratamento da insuficiência cardíaca crônica.",
    dosageInfo: "Adultos: 25 mg a 50 mg, 2 a 3 vezes ao dia, 1 hora antes das refeições (com o estômago vazio).",
    precautions: "Pode provocar tosse seca persistente em algumas pessoas. Contraindicado na gestação.",
    howToAsk: "Por favor, você tem o Captopril 25mg gratuito pelo Farmácia Popular?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "100% Gratuito pelo SUS",
      explanation: "O Captopril genérico é fornecido gratuitamente no Farmácia Popular e nas UBS do SUS.",
    },
    susAvailability: {
      isFreeInSUS: true,
      badgeText: "🟢 100% Gratuito no Posto de Saúde e Farmácia Popular",
      instructions: "Totalmente gratuito no Farmácia Popular e nos postos de saúde.",
      requiresPrescription: true,
    },
    farmaciaPopular: {
      isEligible: true,
      statusType: "gratuito",
      badgeText: "100% Gratuito pelo SUS (Hipertensão)",
      conditionName: "Hipertensão Arterial",
      instructions: "100% gratuito no Farmácia Popular. Basta levar receita médica válida e documento com CPF.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Eficácia regulamentada pela ANVISA e pelo Ministério da Saúde.",
    },
    disclaimer: "Aviso importante: Nunca suspenda o uso de medicamentos da pressão por conta própria.",
  },
  sulfato_ferroso: {
    status: "success",
    commercialName: "Sulfato Ferroso (Suplemento de Ferro)",
    activeIngredient: "Sulfato Ferroso Heptaidratado",
    dosage: "40 mg de ferro elementar (comprimidos) • Gotas 25 mg/mL",
    purpose: "Reposição mineral de ferro para tratamento e prevenção da anemia ferropriva, fraqueza, cansaço excessivo, palidez e queda de cabelo por carência de ferro.",
    dosageInfo: "Adultos: 1 comprimido 1 hora antes das refeições ou 2 horas após. Dica: Ingerir com suco de laranja rico em vitamina C melhora muito a absorção.",
    precautions: "Pode escurecer a cor das fezes (efeito inofensivo) e causar leve constipação ou azia passageira.",
    howToAsk: "Por favor, você tem o Sulfato Ferroso 40mg gratuito pelo posto de saúde / Farmácia Popular?",
    tarjaAmarelaInfo: {
      badgeText: "Medicamento Essencial do SUS",
      lawReference: "Programa Nacional de Suplementação de Ferro",
      savingsPercentRange: "100% Gratuito pelo SUS",
      explanation: "Distribuído gratuitamente em todo o território nacional pelo SUS.",
    },
    susAvailability: {
      isFreeInSUS: true,
      badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
      instructions: "Disponível gratuitamente em todas as UBS do Brasil para gestantes, crianças e adultos.",
      requiresPrescription: false,
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Gratuito em todas as UBS do SUS",
      instructions: "Retirável gratuitamente na rede básica municipal de saúde.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Comprovação mineral e farmacopeia brasileira.",
    },
    disclaimer: "Aviso importante: Não tome junto com leite, café ou antiácidos, pois diminuem a absorção do ferro.",
  },
  postinor: {
    status: "success",
    commercialName: "Postinor-1® / Pozato® (Pílula do Dia Seguinte)",
    activeIngredient: "Levonorgestrel 1,5 mg",
    dosage: "1,5 mg comprimido único (ou 2 de 0,75 mg)",
    purpose: "Contraceptivo oral de emergência. Indicado para prevenir gravidez não planejada após relação sexual desprotegida, rompimento da camisinha ou falha do método anticoncepcional habitual.",
    dosageInfo: "Tomar o comprimido o mais rápido possível, preferencialmente nas primeiras 24 horas e no máximo até 72 horas (3 dias) após o ato desprotegido. A eficácia é maior quanto mais rápido for tomado.",
    precautions: "Método estritamente emergencial que não deve ser utilizado como anticoncepcional rotineiro nem protege contra Infecções Sexualmente Transmissíveis (ISTs).",
    howToAsk: "Por favor, você tem a pílula do dia seguinte genérica de Levonorgestrel 1,5mg?",
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "40% a 65%",
      explanation: "O Levonorgestrel genérico possui a mesma dosagem hormonal e eficácia protetiva a preços muito acessíveis.",
    },
    susAvailability: {
      isFreeInSUS: true,
      badgeText: "🟢 100% Gratuito na UBS do SUS (Sem Receita)",
      instructions: "Distribuído gratuitamente e de forma imediata em qualquer Unidade Básica de Saúde (UBS) do SUS sem necessidade de receita médica.",
      requiresPrescription: false,
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Gratuito nas UBS do SUS",
      instructions: "Disponível gratuitamente nos postos de saúde de todo o Brasil.",
    },
    anvisaRegulation: {
      bioequivalent: true,
      details: "Eficácia contraceptiva regulamentada pela ANVISA.",
    },
    disclaimer: "Aviso importante: Caso ocorra vômito nas primeiras 2 horas após a ingestão, procure orientação farmacêutica para tomar outro comprimido.",
  },
};

// Converts catalog medicines into full MedicineAnalysis representations
function convertCatalogMedicineToAnalysis(med: CatalogMedicine): any {
  const isFreeSus =
    med.farmaciaPopularStatus === "gratuito" ||
    med.category === "Crônicos" ||
    [
      "dipirona", "paracetamol", "amoxicilina", "ibuprofeno", "losartana",
      "metformina", "hidroclorotiazida", "atenolol", "enalapril",
      "salbutamol", "sulfato_ferroso", "acido_folico", "glifage",
      "simeticona", "dimeticona"
    ].includes(med.id);

  const cleanIngredient = med.activeIngredient.split("/")[0].trim();
  const savings = med.estimatedSavings || "45% a 70%";

  return {
    status: "success",
    commercialName: med.referenceName,
    activeIngredient: med.activeIngredient,
    dosage: med.commonDosage,
    purpose: med.briefPurpose || `Medicamento indicado para o tratamento e alívio de condições clínicas em ${med.category}.`,
    dosageInfo: `Adultos: Seguir rigorosamente a posologia (${med.commonDosage}) indicada na bula oficial aprovada pela ANVISA ou a orientação prescrita pelo médico/farmacêutico.`,
    precautions: `Contraindicações e Cuidados: Contraindicado para quem possui alergia aos componentes de ${cleanIngredient}. Gestantes, lactantes e portadores de condições clínicas crônicas devem consultar profissional de saúde antes do uso.`,
    howToAsk: `Por favor, você tem o genérico de ${cleanIngredient} com a tarja amarela?`,
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: savings,
      explanation: `O genérico de ${cleanIngredient} possui rigorosamente a mesma composição química, biodisponibilidade e segurança terapêutica auditadas pela ANVISA, com economia média de ${savings}.`,
    },
    susAvailability: {
      isFreeInSUS: isFreeSus,
      badgeText: isFreeSus
        ? "🟢 100% Gratuito no Posto de Saúde / UBS (SUS)"
        : "Consulte gratuidade na UBS ou compre genérico econômico",
      instructions: isFreeSus
        ? "Consta no elenco da Relação Nacional de Medicamentos Essenciais (RENAME/SUS) e é fornecido gratuitamente na Unidade Básica de Saúde (UBS) do seu bairro mediante apresentação de receita médica e Cartão SUS."
        : "Verifique a disponibilidade na rede básica de saúde do seu município ou adquira a versão genérica com desconto expressivo na farmácia privada.",
      requiresPrescription: true,
    },
    farmaciaPopular: {
      isEligible: med.farmaciaPopularStatus === "gratuito" || med.farmaciaPopularStatus === "copagamento",
      statusType: med.farmaciaPopularStatus,
      badgeText: med.farmaciaPopularStatus === "gratuito"
        ? "100% Gratuito pelo SUS (Farmácia Popular)"
        : med.farmaciaPopularStatus === "copagamento"
        ? "Desconto de até 90% no Farmácia Popular"
        : "Consulte na UBS ou farmácia básica municipal",
      conditionName: med.category,
      instructions: med.farmaciaPopularStatus === "gratuito"
        ? "Totalmente gratuito no Programa Farmácia Popular do Brasil em drogarias credenciadas. Apresente receita válida e documento com foto e CPF."
        : med.farmaciaPopularStatus === "copagamento"
        ? "Subsidiado pelo Ministério da Saúde com até 90% de desconto (e 100% gratuito para beneficiários do Bolsa Família). Leve receita e CPF."
        : "Não integra o rol privado do Farmácia Popular, mas pode ser obtido na farmácia da UBS pública ou como genérico muito acessível.",
    },
    equivalentMedicines: [
      {
        type: "generico",
        name: `${cleanIngredient} Genérico (Tarja Amarela)`,
        activeIngredient: cleanIngredient,
        dosage: med.commonDosage,
        badge: "Tarja Amarela ANVISA",
        savingsEstimated: `Economia de até ${savings}`,
        description: `Genérico oficial com a letra G e tarja amarela, auditado e fiscalizado pela ANVISA.`,
        recommended: true,
      },
      {
        type: "referencia",
        name: med.referenceName,
        activeIngredient: cleanIngredient,
        dosage: med.commonDosage,
        badge: "Marca de Referência",
        savingsEstimated: "Preço de Referência",
        description: "Marca comercial pioneira de referência.",
        recommended: false,
      },
    ],
    quickTips: [
      "Tome sempre com água limpa e filtrada.",
      "Não interrompa o tratamento nem altere a dosagem por conta própria.",
      "Conserve em local fresco, seco e ao abrigo da luz solar direta.",
    ],
    anvisaRegulation: {
      bioequivalent: true,
      details: "Medicamento submetido às normas de Boas Práticas de Fabricação (BPF) regulamentadas e fiscalizadas pela ANVISA.",
    },
    disclaimer: "Aviso importante: Esta informação tem finalidade estritamente informativa. Nunca se automedique e consulte sempre o farmacêutico no balcão ou seu médico.",
  };
}

export function isMedicineQuery(queryText: string): boolean {
  if (!queryText) return false;
  const normalized = queryText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Explicit keywords indicating medicine lookup
  if (
    normalized.includes("remedio") ||
    normalized.includes("medicamento") ||
    normalized.includes("comprimido") ||
    normalized.includes("gotas") ||
    normalized.includes("bula") ||
    normalized.includes("posologia") ||
    normalized.includes("dosagem") ||
    normalized.includes("generico") ||
    normalized.includes("tarja")
  ) {
    return true;
  }

  // Common medicine and active ingredient names
  const knownMeds = [
    "dipirona", "novalgina", "anador", "paracetamol", "tylenol",
    "losartan", "cozaar", "aradois", "omeprazol", "losec", "peprazol",
    "pantoprazol", "pantozol", "dorflex", "neosaldina", "neosa", "aspirina", "aas",
    "sinvastatina", "zocor", "atorvastatina", "atenolol", "atenol", "enalapril",
    "renitec", "captopril", "capoten", "hidroclorotiazida", "clorana", "salbutamol",
    "aerolin", "amoxicilina", "amoxil", "azitromicina", "zitromax", "ibuprofeno",
    "alivium", "advil", "loratadina", "claritin", "desloratadina",
    "ciprofloxacino", "cipro", "fluconazol", "zoltec", "sertralina", "zoloft",
    "clonazepam", "rivotril", "buscopan", "escopolamina", "hioscina", "dramin",
    "plasil", "metoclopramida", "vonau", "ondansetrona", "prednisona", "prelone",
    "dexametasona", "decadron", "luftal", "simeticona", "flagass", "allegra", "fexofenadina",
    "glifage", "metformina", "nimesulida", "scaflam", "diclofenaco", "voltaren",
    "cataflam", "puran", "levotiroxina", "doralgina", "lisador", "torsilax", "tandrilax",
    "albendazol", "zentel", "annita", "nitazoxanida", "floratil", "propranolol",
    "fluoxetina", "escitalopram", "sulfato ferroso", "acido folico", "postinor"
  ];

  for (const med of knownMeds) {
    if (normalized.includes(med)) {
      return true;
    }
  }

  // Match against POPULAR_MEDICINES catalog
  const cleanQ = normalized.replace(/[®™\(\)]/g, "").trim();
  for (const med of POPULAR_MEDICINES) {
    const medId = med.id.toLowerCase();
    const medRef = med.referenceName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[®™\(\)]/g, "");
    if (cleanQ === medId || cleanQ.includes(medId) || medRef.includes(cleanQ) || cleanQ.includes(medRef.split("/")[0].trim())) {
      return true;
    }
  }

  return false;
}

function getLocalDatabaseMatch(queryText: string): any | null {
  if (!queryText) return null;
  const normalized = queryText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // 1. Direct key match in BRAZILIAN_MEDICINES_DB
  if (BRAZILIAN_MEDICINES_DB[normalized]) {
    return BRAZILIAN_MEDICINES_DB[normalized];
  }

  // 2. High-priority common brand and active ingredient aliases in rich DB
  if (normalized.includes("luftal") || normalized.includes("simeticon") || normalized.includes("dimeticon") || normalized.includes("flagass")) {
    return BRAZILIAN_MEDICINES_DB.luftal;
  }
  if (normalized.includes("buscopan") || normalized.includes("escopolamina") || normalized.includes("hioscina")) {
    return BRAZILIAN_MEDICINES_DB.buscopan;
  }
  if (normalized.includes("neosaldina") || normalized.includes("neosa") || normalized.includes("isometepteno")) {
    return BRAZILIAN_MEDICINES_DB.neosaldina;
  }
  if (normalized.includes("nimesulid") || normalized.includes("nisulid") || normalized.includes("scaflam")) {
    return BRAZILIAN_MEDICINES_DB.nimesulida;
  }
  if (normalized.includes("cataflam") || normalized.includes("voltaren") || normalized.includes("diclofenaco")) {
    return BRAZILIAN_MEDICINES_DB.diclofenaco;
  }
  if (normalized.includes("dramin") || normalized.includes("dimenidrinat")) {
    return BRAZILIAN_MEDICINES_DB.dramin;
  }
  if (normalized.includes("plasil") || normalized.includes("metoclopramid")) {
    return BRAZILIAN_MEDICINES_DB.plasil;
  }
  if (normalized.includes("pantoprazol") || normalized.includes("pantozol")) {
    return BRAZILIAN_MEDICINES_DB.pantoprazol;
  }
  if (normalized.includes("allegra") || normalized.includes("fexofenadin")) {
    return BRAZILIAN_MEDICINES_DB.allegra;
  }
  if (normalized.includes("torsilax") || normalized.includes("tandrilax")) {
    return BRAZILIAN_MEDICINES_DB.torsilax;
  }
  if (normalized.includes("azitromicin") || normalized.includes("zitromax") || normalized.includes("astro")) {
    return BRAZILIAN_MEDICINES_DB.azitromicina;
  }
  if (normalized.includes("albendazol") || normalized.includes("zentel")) {
    return BRAZILIAN_MEDICINES_DB.albendazol;
  }
  if (normalized.includes("captopril") || normalized.includes("capoten")) {
    return BRAZILIAN_MEDICINES_DB.captopril;
  }
  if (normalized.includes("sulfato ferroso") || normalized.includes("ferroso")) {
    return BRAZILIAN_MEDICINES_DB.sulfato_ferroso;
  }
  if (normalized.includes("postinor") || normalized.includes("dia seguinte") || normalized.includes("pozato")) {
    return BRAZILIAN_MEDICINES_DB.postinor;
  }
  if (normalized.includes("glifage") || normalized.includes("metformina")) {
    return BRAZILIAN_MEDICINES_DB.glifage;
  }
  if (normalized.includes("dorflex") || normalized.includes("orfenadrina")) {
    return BRAZILIAN_MEDICINES_DB.dorflex;
  }
  if (normalized.includes("losartan") || normalized.includes("cozaar") || normalized.includes("aradois")) {
    return BRAZILIAN_MEDICINES_DB.losartana;
  }
  if (normalized.includes("tylenol") || normalized.includes("paracetamol")) {
    return BRAZILIAN_MEDICINES_DB.tylenol;
  }
  if (normalized.includes("puran") || normalized.includes("levotiroxina")) {
    return BRAZILIAN_MEDICINES_DB.puran;
  }
  if (normalized.includes("aspirina") || normalized.includes("aas") || normalized.includes("acetilsalicilico")) {
    return BRAZILIAN_MEDICINES_DB.aspirina;
  }
  if (normalized.includes("omeprazol") || normalized.includes("losec") || normalized.includes("peprazol")) {
    return BRAZILIAN_MEDICINES_DB.omeprazol;
  }
  if (normalized.includes("dipirona") || normalized.includes("novalgina") || normalized.includes("anador")) {
    return BRAZILIAN_MEDICINES_DB.dipirona;
  }
  if (normalized.includes("sinvastatina") || normalized.includes("zocor")) {
    return BRAZILIAN_MEDICINES_DB.sinvastatina;
  }
  if (normalized.includes("atenolol") || normalized.includes("atenol")) {
    return BRAZILIAN_MEDICINES_DB.atenolol;
  }
  if (normalized.includes("enalapril") || normalized.includes("renitec")) {
    return BRAZILIAN_MEDICINES_DB.enalapril;
  }
  if (normalized.includes("hidroclorotiazida") || normalized.includes("clorana")) {
    return BRAZILIAN_MEDICINES_DB.hidroclorotiazida;
  }
  if (normalized.includes("aerolin") || normalized.includes("salbutamol")) {
    return BRAZILIAN_MEDICINES_DB.salbutamol;
  }
  if (normalized.includes("amoxicilina") || normalized.includes("amoxil")) {
    return BRAZILIAN_MEDICINES_DB.amoxicilina;
  }
  if (normalized.includes("ibuprofeno") || normalized.includes("alivium") || normalized.includes("advil")) {
    return BRAZILIAN_MEDICINES_DB.ibuprofeno;
  }
  if (normalized.includes("loratadina") || normalized.includes("claritin")) {
    return BRAZILIAN_MEDICINES_DB.loratadina;
  }
  if (normalized.includes("ciprofloxacino") || normalized.includes("cipro")) {
    return BRAZILIAN_MEDICINES_DB.ciprofloxacino;
  }
  if (normalized.includes("fluconazol") || normalized.includes("zoltec")) {
    return BRAZILIAN_MEDICINES_DB.fluconazol;
  }
  if (normalized.includes("sertralina") || normalized.includes("zoloft")) {
    return BRAZILIAN_MEDICINES_DB.sertralina;
  }
  if (normalized.includes("clonazepam") || normalized.includes("rivotril")) {
    return BRAZILIAN_MEDICINES_DB.clonazepam;
  }

  // 3. Scan the 112 medicines in POPULAR_MEDICINES catalog
  const cleanQ = normalized.replace(/[®™\(\)]/g, "").trim();
  for (const med of POPULAR_MEDICINES) {
    const medId = med.id.toLowerCase();
    const medRef = med.referenceName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[®™\(\)]/g, "");
    const medActive = med.activeIngredient.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[®™\(\)]/g, "");
    const medSearch = med.searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (
      cleanQ === medId ||
      cleanQ.includes(medId) ||
      medRef.includes(cleanQ) ||
      cleanQ.includes(medRef.split("/")[0].trim()) ||
      medActive.includes(cleanQ) ||
      cleanQ.includes(medActive.split("/")[0].trim()) ||
      medSearch.includes(cleanQ)
    ) {
      return convertCatalogMedicineToAnalysis(med);
    }
  }

  return null;
}

// Curated instant ANVISA & SUS knowledge base for common symptoms
const BRAZILIAN_SYMPTOMS_DB: Record<string, any> = {
  cabeca: {
    status: "success",
    symptomQuery: "Dor de cabeça / Enxaqueca / Cefaleia",
    clinicalOverview: "A dor de cabeça pode ter origens tensionais (estresse, postura, cansaço) ou ser de caráter enxaquecoso (latejante, sensibilidade à luz ou barulho). Para a grande maioria dos casos leves a moderados, analgésicos comuns proporcionam alívio eficaz.",
    recommendedMedicines: [
      {
        referenceName: "Novalgina® ou Anador®",
        activeIngredient: "Dipirona Monoidratada",
        dosage: "500 mg a 1.000 mg (comprimido ou gotas)",
        whyItHelps: "Analgésico e antipirético consagrado que age bloqueando a percepção da dor no sistema nervoso.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Disponível na farmácia básica de qualquer Unidade Básica de Saúde (UBS) do SUS. Leve seu Cartão SUS e documento.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Dipirona 500mg ou 1g?",
        precautions: "Contraindicado para pessoas com alergia a pirazolonas ou histórico de agranulocitose.",
      },
      {
        referenceName: "Tylenol®",
        activeIngredient: "Paracetamol",
        dosage: "500 mg a 750 mg",
        whyItHelps: "Analgésico suave no estômago, excelente opção para quem tem gastrite ou não tolera a dipirona.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Distribuído gratuitamente nos postos de saúde de todo o Brasil (RENAME/SUS).",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Paracetamol 750mg com tarja amarela?",
        precautions: "Não ultrapasse 4g ao dia para proteger o fígado. Evite consumo concomitante com bebidas alcoólicas.",
      },
      {
        referenceName: "Neosaldina® (Neosa)",
        activeIngredient: "Dipirona + Mucato de Isometepteno + Cafeína",
        dosage: "Drágeas (comprimidos)",
        whyItHelps: "Específico para dores de cabeça e enxaquecas, pois contrai os vasos dilatados e potencializa o alívio.",
        susAvailability: {
          status: "particular_generico",
          badgeText: "⚪ Genérico Barato na Farmácia (Tarja Amarela)",
          instructions: "Não consta no rol gratuito do SUS, mas possui versões genéricas e similares que custam até 60% menos.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o similar genérico da fórmula da Neosaldina?",
        precautions: "Pode elevar ligeiramente a pressão arterial em pessoas hipertensas devido ao isometepteno.",
      },
    ],
    warningSigns: [
      "Dor súbita e explosiva ('a pior dor de cabeça da vida')",
      "Febre alta acompanhada de rigidez na nuca ou confusão mental",
      "Perda de força em um lado do corpo, alteração na fala ou visão dupla",
      "Dor de cabeça após queda ou trauma craniano recente",
    ],
    homeCareTips: [
      "Repouse em ambiente escuro, silencioso e bem ventilado",
      "Coloque uma compressa fria sobre a testa ou na nuca por 15 minutos",
      "Mantenha boa hidratação com água fresca e evite telas de celular",
    ],
    disclaimer: "Aviso importante: Esta orientação tem finalidade estritamente informativa. Se a dor persistir por mais de 48 horas ou for recorrente, consulte um médico na UBS ou UPA.",
  },
  febre: {
    status: "success",
    symptomQuery: "Febre e Mal-estar Geral",
    clinicalOverview: "A febre é uma resposta natural de defesa do corpo humano contra infecções virais ou bacterianas. Considera-se febre temperatura axilar acima de 37,8°C. O objetivo do antitérmico é trazer conforto e prevenir desidratação.",
    recommendedMedicines: [
      {
        referenceName: "Novalgina®",
        activeIngredient: "Dipirona Monoidratada",
        dosage: "500 mg a 1g (adultos) ou gotas por peso",
        whyItHelps: "Poderoso antitérmico que reduz a temperatura corporal de forma rápida e segura.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Item essencial disponível em qualquer posto de saúde ou UPA do SUS.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Dipirona Monoidratada 500mg?",
        precautions: "Respeitar intervalo de no mínimo 6 horas entre as doses.",
      },
      {
        referenceName: "Tylenol®",
        activeIngredient: "Paracetamol",
        dosage: "500 mg a 750 mg",
        whyItHelps: "Reduz a temperatura e alivia as dores no corpo e articulações associadas ao estado febril.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Disponível sem custo em todas as Unidades Básicas de Saúde.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Paracetamol 750mg?",
        precautions: "Nunca dobrar a dose se a febre não baixar imediatamente.",
      },
      {
        referenceName: "Alivium® / Advil®",
        activeIngredient: "Ibuprofeno",
        dosage: "400 mg a 600 mg",
        whyItHelps: "Antitérmico e anti-inflamatório útil quando há dor de garganta ou dor no corpo associada.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Disponível nas farmácias municipais do SUS.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Ibuprofeno 600mg?",
        precautions: "Tomar sempre após refeições para não agredir o estômago. Evitar se houver suspeita de dengue.",
      },
    ],
    warningSigns: [
      "Febre acima de 39,5°C que não cede após o antitérmico",
      "Febre persistente por mais de 3 dias consecutivos",
      "Manchas vermelhas pelo corpo, sangramentos no nariz/gengiva ou vômitos incoercíveis (alerta de dengue)",
      "Falta de ar, cansaço extremo ou confusão mental",
    ],
    homeCareTips: [
      "Beba muitos líquidos: água, água de coco e soro caseiro",
      "Tome banho com água morna (nunca fria ou gelada) para baixar a temperatura gradualmente",
      "Vista roupas leves e mantenha o ambiente fresco e arejado",
    ],
    disclaimer: "Aviso importante: Se houver suspeita de dengue na sua região, NUNCA utilize ácido acetilsalicílico (Aspirina) nem anti-inflamatórios como o Ibuprofeno sem orientação médica.",
  },
  azia: {
    status: "success",
    symptomQuery: "Azia, Queimação e Má Digestão (Gastrite / Refluxo)",
    clinicalOverview: "A azia surge quando o ácido do estômago sobe para o esôfago, causando sensação de queimação no peito, regurgitação ácida e desconforto após as refeições. Frituras, café, refrigerantes e deitar logo após comer são causas frequentes.",
    recommendedMedicines: [
      {
        referenceName: "Losec® / Prepazol®",
        activeIngredient: "Omeprazol",
        dosage: "20 mg (tomar pela manhã em jejum)",
        whyItHelps: "Inibe a bomba de prótons, diminuindo drasticamente a acidez do estômago e cicatrizando irritações.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Disponível gratuitamente em postos de saúde de todo o país através da RENAME.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Omeprazol 20mg com tarja amarela?",
        precautions: "Tomar 30 minutos antes do café da manhã para atingir eficácia máxima.",
      },
      {
        referenceName: "Mylanta Plus®",
        activeIngredient: "Hidróxido de Alumínio + Hidróxido de Magnésio + Simeticona",
        dosage: "10 mL a 15 mL (colher de sopa) após refeições",
        whyItHelps: "Antiácido de alívio instantâneo que neutraliza o ácido presente na hora da crise.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 Disponível no Posto de Saúde / UBS",
          instructions: "Distribuído gratuitamente no SUS ou encontrado a preços muito acessíveis em qualquer drogaria.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o antiácido genérico de hidróxido de alumínio e magnésio?",
        precautions: "Não ingerir junto com outros medicamentos para não prejudicar a absorção.",
      },
      {
        referenceName: "Luftal®",
        activeIngredient: "Simeticona",
        dosage: "40 mg (comprimidos) ou 75mg/mL (gotas)",
        whyItHelps: "Rompe as bolhas de gases no estômago e intestino, aliviando o estufamento e a sensação de peso.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 Disponível no Posto de Saúde / UBS",
          instructions: "Fornecido na farmácia básica do SUS.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Simeticona em gotas ou comprimido?",
        precautions: "Medicamento bastante seguro com quase nenhuma absorção sistêmica.",
      },
    ],
    warningSigns: [
      "Dor forte no peito que irradia para o braço esquerdo, mandíbula ou costas (alerta de infarto cardíaco!)",
      "Vômito com sangue ou fezes escuras como borra de café",
      "Dificuldade ou dor intensa para engolir alimentos",
      "Perda de peso involuntária e anemia progressiva",
    ],
    homeCareTips: [
      "Evite deitar-se antes de 2 horas após o almoço ou jantar",
      "Eleve a cabeceira da cama em cerca de 10 a 15 cm",
      "Evite café, refrigerantes, bebidas alcoólicas, pimenta, frituras e chocolate durante as crises",
    ],
    disclaimer: "Aviso importante: A dor de queimação no estômago pode às vezes ser confundida com problemas cardíacos. Em caso de dúvida ou dor com aperto no peito, vá imediatamente à UPA.",
  },
  gripe: {
    status: "success",
    symptomQuery: "Gripe, Resfriado, Coriza e Dor no Corpo",
    clinicalOverview: "Infecções virais das vias respiratórias superiores causam congestão nasal, espirros, garganta irritada, coriza e dores articulares. Antibióticos NÃO funcionam para gripe. O tratamento correto foca em controlar sintomas e manter repouso.",
    recommendedMedicines: [
      {
        referenceName: "Tylenol® / Novalgina®",
        activeIngredient: "Paracetamol ou Dipirona",
        dosage: "500 mg a 750 mg a cada 6 a 8 horas",
        whyItHelps: "Alivia a febre, a sensação de corpo moído e a dor de cabeça típica do quadro gripal.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Disponível sem custo em qualquer posto de saúde da rede pública.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Paracetamol 750mg ou Dipirona 500mg?",
        precautions: "Evite misturar antigripais compostos que já contenham paracetamol para não sobrecarregar o fígado.",
      },
      {
        referenceName: "Claritin®",
        activeIngredient: "Loratadina",
        dosage: "10 mg (1 comprimido ao dia)",
        whyItHelps: "Anti-histamínico que seca a coriza excessiva, reduz os espirros contínuos e não causa sono pesado.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Consta na RENAME e é distribuído gratuitamente nos postos SUS.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Loratadina 10mg?",
        precautions: "Tomar uma vez a cada 24 horas, preferencialmente no mesmo horário.",
      },
      {
        referenceName: "Soro Fisiológico 0,9%",
        activeIngredient: "Cloreto de Sódio 0,9%",
        dosage: "Lavagem nasal com seringa ou spray (10 a 20mL por narina)",
        whyItHelps: "Limpa as vias aéreas, remove secreções espessas e vírus, desobstruindo o nariz naturalmente.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Frascos de soro fisiológico são fornecidos sem custo nos postos de saúde.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem frasco de Soro Fisiológico 0,9% de 500mL?",
        precautions: "Mantenha a cabeça inclinada para frente durante a lavagem para não engolir o soro.",
      },
    ],
    warningSigns: [
      "Falta de ar ou respiração rápida e ofegante",
      "Dor no peito ao inspirar fundo ou tosse com sangue",
      "Febre que não cede após 3 dias ou melhora e volta com intensidade maior",
      "Lábios ou pontas dos dedos arroxeadas",
    ],
    homeCareTips: [
      "Hidratação abundante: beba no mínimo 2 a 3 litros de água, chás e sucos cítricos ao dia",
      "Repouso absoluto para que o sistema imunológico combata o vírus com eficácia",
      "Faça lavagem nasal com soro morno 3 a 4 vezes ao dia",
    ],
    disclaimer: "Aviso importante: Gripe é causada por vírus. Não use antibióticos por conta própria, pois eles não matam vírus e podem causar resistência bacteriana grave.",
  },
  muscular: {
    status: "success",
    symptomQuery: "Dor Muscular, Coluna Travada e Torcicolo",
    clinicalOverview: "Contraturas musculares, má postura no trabalho, esforço físico excessivo e estresse tensionam as fibras musculares, gerando nós dolorosos e rigidez na coluna ou pescoço.",
    recommendedMedicines: [
      {
        referenceName: "Dorflex®",
        activeIngredient: "Dipirona + Citrato de Orfenadrina + Cafeína",
        dosage: "1 a 2 comprimidos a cada 8 horas",
        whyItHelps: "Combinação clássica que une relaxante muscular e analgésico, destravando a musculatura contraída.",
        susAvailability: {
          status: "particular_generico",
          badgeText: "⚪ Genérico Barato na Farmácia (Tarja Amarela)",
          instructions: "Genéricos da fórmula custam entre 40% e 60% menos que a marca de referência nas drogarias.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o similar genérico da fórmula do Dorflex com tarja amarela?",
        precautions: "Pode causar leve sonolência ou boca seca devido à orfenadrina.",
      },
      {
        referenceName: "Advil® / Alivium®",
        activeIngredient: "Ibuprofeno",
        dosage: "600 mg a cada 8 a 12 horas",
        whyItHelps: "Anti-inflamatório que reduz o inchaço e a inflamação ao redor das articulações e tendões.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Disponível nas farmácias do SUS.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Ibuprofeno 600mg?",
        precautions: "Tomar sempre após as refeições. Não tomar por mais de 5 a 7 dias sem supervisão médica.",
      },
      {
        referenceName: "Miosan®",
        activeIngredient: "Cloridrato de Ciclobenzaprina",
        dosage: "5 mg a 10 mg ao deitar",
        whyItHelps: "Relaxante muscular potente de ação central, muito eficaz em torcicolos severos e lombalgias agudas.",
        susAvailability: {
          status: "particular_generico",
          badgeText: "⚪ Genérico Econômico na Drogaria",
          instructions: "Vendido em farmácias particulares com genéricos bem acessíveis.",
          requiresPrescription: true,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Ciclobenzaprina 5mg?",
        precautions: "Provoca sonolência moderada; tomar de preferência à noite antes de dormir.",
      },
    ],
    warningSigns: [
      "Dor que irradia para a perna acompanhada de dormência ou perda de força no pé (alerta de hérnia de disco)",
      "Perda de controle da urina ou fezes",
      "Dor lombar com febre alta e calafrios (alerta de infecção renal)",
    ],
    homeCareTips: [
      "Aplique compressa morna no local por 20 minutos 3 vezes ao dia para relaxar as fibras musculares",
      "Faça alongamentos suaves sem forçar o limite da dor",
      "Mantenha postura correta ao sentar e evite carregar peso em um só lado do corpo",
    ],
    disclaimer: "Aviso importante: Se a dor lombar travar seus movimentos ou não melhorar em 3 dias, consulte um clínico geral na UBS.",
  },
  alergia: {
    status: "success",
    symptomQuery: "Rinite, Alergia, Espirros e Coceira",
    clinicalOverview: "A rinite alérgica é desencadeada por ácaros, poeira, pólen, pelos de animais ou mudanças bruscas de temperatura, inflamando a mucosa nasal e provocando coceira nos olhos e espirros seguidos.",
    recommendedMedicines: [
      {
        referenceName: "Claritin®",
        activeIngredient: "Loratadina",
        dosage: "10 mg (1 vez ao dia)",
        whyItHelps: "Antialérgico de 2ª geração que bloqueia a histamina, aliviando coceira, espirros e olhos lacrimejantes sem causar sono.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Consta no elenco da RENAME distribuído sem custo nos postos de saúde.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Loratadina 10mg?",
        precautions: "Tomar uma única dose diária.",
      },
      {
        referenceName: "Busonid® Spray Nasal",
        activeIngredient: "Budesonida Spray Nasal",
        dosage: "32 mcg ou 50 mcg (1 a 2 jatos em cada narina pela manhã)",
        whyItHelps: "Corticoide tópico de ação local que desinflama a mucosa do nariz, prevenindo novas crises alérgicas.",
        susAvailability: {
          status: "copagamento",
          badgeText: "🟡 Até 90% de Desconto no Farmácia Popular",
          instructions: "Disponível no Farmácia Popular com copagamento muito reduzido ou no posto do SUS com receita.",
          requiresPrescription: true,
        },
        howToAskAtCounter: "Por favor, você tem o spray nasal genérico de Budesonida pelo Farmácia Popular?",
        precautions: "Uso contínuo conforme indicação médica; não apontar o jato para o septo nasal central.",
      },
      {
        referenceName: "Polaramine®",
        activeIngredient: "Maleato de Dexclorfeniramina",
        dosage: "2 mg a 6 mg",
        whyItHelps: "Alívio rápido de coceiras agudas na pele, urticárias e reações alérgicas repentinas.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Disponível na farmácia básica do SUS.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Dexclorfeniramina 2mg?",
        precautions: "Causa sonolência; evite dirigir veículos ou operar máquinas após tomar.",
      },
    ],
    warningSigns: [
      "Inchaço nos lábios, língua ou ao redor dos olhos com sensação de garganta fechando (anafilaxia - URGÊNCIA MÁXIMA!)",
      "Falta de ar súbita e chiado no peito",
      "Placas vermelhas espalhando-se rapidamente pelo corpo",
    ],
    homeCareTips: [
      "Lave o nariz diariamente com soro fisiológico 0,9% para remover alérgenos",
      "Troque roupas de cama semanalmente e lave com água morna",
      "Evite cortinas pesadas, tapetes e espanadores que acumulem ácaros",
    ],
    disclaimer: "Aviso importante: Em caso de inchaço na garganta ou falta de ar, ligue para o SAMU (192) ou vá à UPA imediatamente.",
  },
  colica: {
    status: "success",
    symptomQuery: "Cólica Menstrual / Dor em Espasmo Abdominal",
    clinicalOverview: "A cólica menstrual (dismenorreia) decorre da liberação de prostaglandinas que provocam contrações fortes na musculatura uterina. Analgésicos antiespasmódicos e anti-inflamatórios são a base do tratamento.",
    recommendedMedicines: [
      {
        referenceName: "Buscopan Composto®",
        activeIngredient: "Butilbrometo de Escopolamina + Dipirona",
        dosage: "1 a 2 comprimidos a cada 6 a 8 horas",
        whyItHelps: "A escopolamina relaxa a musculatura em espasmo e a dipirona bloqueia a dor, cortando a cólica na raiz.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 Escopolamina Gratuita no Posto de Saúde / UBS",
          instructions: "Distribuída nas Unidades Básicas de Saúde do SUS.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Escopolamina com Dipirona?",
        precautions: "Não utilizar se tiver glaucoma de ângulo fechado.",
      },
      {
        referenceName: "Ponstan®",
        activeIngredient: "Ácido Mefenâmico",
        dosage: "500 mg (1 comprimido a cada 8 horas com refeições)",
        whyItHelps: "Inibe a produção das prostaglandinas no útero, diminuindo o fluxo excessivo e as dores da cólica.",
        susAvailability: {
          status: "particular_generico",
          badgeText: "⚪ Genérico Econômico na Farmácia",
          instructions: "Vendido com genéricos muito baratos com tarja amarela na rede particular.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Ácido Mefenâmico 500mg com tarja amarela?",
        precautions: "Tomar sempre com alimentos para não irritar o estômago.",
      },
      {
        referenceName: "Atroveran®",
        activeIngredient: "Dipirona + Papaverina + Extratos antiespasmódicos",
        dosage: "1 comprimido ou gotas",
        whyItHelps: "Tradicional alívio sintomático das contrações do trato digestivo e geniturinário.",
        susAvailability: {
          status: "particular_generico",
          badgeText: "⚪ Venda Livre em Drogarias",
          instructions: "Medicamento isento de prescrição disponível no balcão da farmácia.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o antiespasmódico similar para cólica?",
        precautions: "Respeitar os horários e dosagens da bula.",
      },
    ],
    warningSigns: [
      "Cólica de intensidade incapacitante que não responde a medicações comuns (investigar endometriose)",
      "Sangramento menstrual com coágulos grandes e desmaios",
      "Febre associada a corrimento com odor fétido",
      "Possibilidade de gravidez associada a dor súbita em um lado da virilha (alerta de gravidez ectópica)",
    ],
    homeCareTips: [
      "Aplique uma bolsa de água morna sobre o baixo ventre por 20 minutos",
      "Chás quentes de camomila ou gengibre ajudam a relaxar a musculatura",
      "Pratique caminhadas leves e mantenha repouso nas primeiras 24 horas",
    ],
    disclaimer: "Aviso importante: Cólicas severas e recorrentes devem ser investigadas com um ginecologista na UBS para descartar endometriose ou miomas.",
  },
  garganta: {
    status: "success",
    symptomQuery: "Dor de Garganta e Inflamação ao Engolir",
    clinicalOverview: "A dor de garganta é na maioria das vezes de origem viral (faringite viral), causando vermelhidão e incômodo ao engolir. Anti-inflamatórios e analgésicos trazem alívio rápido enquanto o corpo se recupera.",
    recommendedMedicines: [
      {
        referenceName: "Advil® / Alivium®",
        activeIngredient: "Ibuprofeno",
        dosage: "600 mg a cada 8 horas (após refeições)",
        whyItHelps: "Potente ação anti-inflamatória que desincha as amígdalas e elimina a dor ao engolir.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Fornecido sem custo nas farmácias municipais do SUS.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Ibuprofeno 600mg com tarja amarela?",
        precautions: "Tomar sempre após as refeições. Não tomar se tiver úlcera gástrica ativa.",
      },
      {
        referenceName: "Novalgina®",
        activeIngredient: "Dipirona Monoidratada",
        dosage: "500 mg a 1g a cada 6 horas",
        whyItHelps: "Analgésico e antitérmico para alívio da dor aguda e de febre associada.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Disponível em qualquer posto do SUS.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Dipirona 500mg ou 1g?",
        precautions: "Respeitar intervalo mínimo de 6 horas.",
      },
      {
        referenceName: "Flogoral® / Strepsils®",
        activeIngredient: "Benzidamina ou Flurbiprofeno (Pastilhas ou Spray)",
        dosage: "Pastilha dissolvida na boca a cada 4 horas ou 2 jatos de spray",
        whyItHelps: "Ação anestésica e analgésica tópica imediata na mucosa da garganta.",
        susAvailability: {
          status: "particular_generico",
          badgeText: "⚪ Venda Livre em Farmácias",
          instructions: "MIP disponível no balcão da farmácia.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem pastilhas ou spray anestésico genérico para garganta?",
        precautions: "Não engolir a pastilha inteira; deixe dissolver lentamente.",
      },
    ],
    warningSigns: [
      "Presença de placas brancas de pus visíveis nas amígdalas com febre alta (necessita de avaliação médica para antibiótico)",
      "Dificuldade séria para respirar ou engolir a própria saliva",
      "Inchaço visível no pescoço ou incapacidade de abrir a boca",
    ],
    homeCareTips: [
      "Faça gargarejos com água morna e sal (meia colher de café de sal em 1 copo d'água) 3 vezes ao dia",
      "Consuma alimentos mornos, líquidos ou pastosos (sopas, caldos e purês)",
      "Beba água com mel e limão para hidratar e suavizar a mucosa",
    ],
    disclaimer: "Aviso importante: Nunca compre antibióticos como Amoxicilina sem prescrição médica. Apenas infecções bacterianas confirmadas necessitam de antibióticos.",
  },
  diarreia: {
    status: "success",
    symptomQuery: "Diarreia, Náusea, Vômito e Enjoo",
    clinicalOverview: "Episódios de gastrenterite aguda provocam perda rápida de água e eletrólitos. O maior perigo é a desidratação, especialmente em crianças e idosos. A prioridade absoluta é a reidratação oral.",
    recommendedMedicines: [
      {
        referenceName: "Sais para Reidratação Oral (SRO)",
        activeIngredient: "Cloreto de Sódio + Citrato de Sódio + Cloreto de Potássio + Glicose",
        dosage: "1 envelope dissolvido em exatamente 1 litro de água tratada/filtrada",
        whyItHelps: "Tratamento salvador de vidas aprovado pela OMS que repõe água, sais minerais e glicose na proporção perfeita.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Envelopes de sais de reidratação são distribuídos gratuitamente em qualquer posto de saúde do Brasil.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem sachês de Sais de Reidratação Oral (SRO)?",
        precautions: "Dissolver no volume exato de água indicado no envelope (nunca menos nem mais).",
      },
      {
        referenceName: "Plasil®",
        activeIngredient: "Cloridrato de Metoclopramida",
        dosage: "10 mg (1 comprimido antes das refeições)",
        whyItHelps: "Antiemético que acelera o esvaziamento gástrico e cessa as náuseas e vômitos.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Disponível na farmácia básica do SUS.",
          requiresPrescription: true,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Metoclopramida 10mg?",
        precautions: "Evitar uso repetitivo sem orientação médica devido a possíveis efeitos extrapiramidais.",
      },
      {
        referenceName: "Floratil®",
        activeIngredient: "Saccharomyces boulardii (Probiótico)",
        dosage: "1 a 2 cápsulas ou sachês ao dia",
        whyItHelps: "Restaura a flora bacteriana intestinal benéfica, encurtando a duração da diarreia.",
        susAvailability: {
          status: "particular_generico",
          badgeText: "⚪ Venda em Drogarias",
          instructions: "Disponível em farmácias com versões de probióticos acessíveis.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o probiótico genérico de Saccharomyces boulardii?",
        precautions: "Não tomar com líquidos muito quentes para não inativar o levedo probiótico.",
      },
    ],
    warningSigns: [
      "Sinais de desidratação severa: boca muito seca, olhos fundos, ausência de urina por mais de 8 horas e fraqueza intensa",
      "Presença de sangue, muco ou pus nas fezes",
      "Febre alta acompanhada de dor abdominal contínua e intensa",
      "Vômitos incontroláveis que impedem ingerir qualquer líquido",
    ],
    homeCareTips: [
      "Beba o soro de reidratação aos poucos, em pequenos goles, mesmo se houver náusea",
      "Consuma alimentos leves: arroz branco, maçã sem casca, torrada e banana-maçã",
      "Evite leite, queijos, frituras, refrigerantes e cafeína até que as fezes voltem ao normal",
    ],
    disclaimer: "Aviso importante: Não tome remédios para 'prender o intestino' (como Loperamida) sem recomendação médica se houver febre ou sangue nas fezes.",
  },
};

function getLocalSymptomMatch(text: string): any {
  if (!text) return null;
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized.includes("cabeca") || normalized.includes("enxaqueca") || normalized.includes("cefaleia")) {
    return BRAZILIAN_SYMPTOMS_DB.cabeca;
  }
  if (normalized.includes("febre") || normalized.includes("calafrio") || normalized.includes("temperatura alta")) {
    return BRAZILIAN_SYMPTOMS_DB.febre;
  }
  if (normalized.includes("azia") || normalized.includes("queimacao") || normalized.includes("gastrite") || normalized.includes("refluxo") || normalized.includes("estomago")) {
    return BRAZILIAN_SYMPTOMS_DB.azia;
  }
  if (normalized.includes("gripe") || normalized.includes("resfriado") || normalized.includes("coriza") || normalized.includes("nariz escorrendo") || normalized.includes("corpo moido")) {
    return BRAZILIAN_SYMPTOMS_DB.gripe;
  }
  if (normalized.includes("muscular") || normalized.includes("coluna") || normalized.includes("costas") || normalized.includes("torcicolo") || normalized.includes("lombar") || normalized.includes("travad")) {
    return BRAZILIAN_SYMPTOMS_DB.muscular;
  }
  if (normalized.includes("alergia") || normalized.includes("rinite") || normalized.includes("espirro") || normalized.includes("nariz entupido") || normalized.includes("coceira")) {
    return BRAZILIAN_SYMPTOMS_DB.alergia;
  }
  if (normalized.includes("colica") || normalized.includes("menstru") || normalized.includes("utero") || normalized.includes("espasmo")) {
    return BRAZILIAN_SYMPTOMS_DB.colica;
  }
  if (normalized.includes("garganta") || normalized.includes("engolir") || normalized.includes("amigdala")) {
    return BRAZILIAN_SYMPTOMS_DB.garganta;
  }
  if (normalized.includes("diarreia") || normalized.includes("enjoo") || normalized.includes("vomit") || normalized.includes("nausea") || normalized.includes("estufamento")) {
    return BRAZILIAN_SYMPTOMS_DB.diarreia;
  }

  return null;
}

function buildDynamicFallbackMedicine(queryText: string): any {
  // First check if catalog or rich DB already has it
  const localMatch = getLocalDatabaseMatch(queryText);
  if (localMatch) return localMatch;

  const cleanName = (queryText || "Medicamento")
    .trim()
    .replace(/^(o|a|os|as|um|uma)\s+/i, "")
    .replace(/[^\w\sáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ-]/gi, "");
  const capitalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

  return {
    status: "success",
    commercialName: `${capitalized} (Medicamento)`,
    activeIngredient: `${capitalized}`,
    dosage: "Conforme prescrição médica ou bula oficial aprovada pela ANVISA",
    purpose: `Indicação Clínica Principal: Medicamento indicado para alívio de sintomas e tratamento clínico associado a ${cleanName}. Para conferir a indicação terapêutica completa aprovada pela ANVISA, consulte a bula oficial do produto ou tire dúvidas diretamente com o farmacêutico no balcão da farmácia.`,
    dosageInfo: "Adultos: Seguir rigorosamente a dosagem e intervalos prescritos na bula ou pelo seu médico/farmacêutico. Não dobre doses por esquecimento.",
    precautions: "Contraindicações e Cuidados: Contraindicado para quem possui alergia aos componentes da fórmula. Gestantes, lactantes, hipertensos e portadores de insuficiência renal ou hepática devem consultar médico antes de usar.",
    howToAsk: `Por favor, você tem o genérico de ${capitalized} com a tarja amarela?`,
    tarjaAmarelaInfo: {
      badgeText: "Genérico Oficial com Tarja Amarela e letra 'G'",
      lawReference: "Lei Federal nº 9.787/1999",
      savingsPercentRange: "35% a 65%",
      explanation: `O medicamento genérico possui rigorosamente a mesma composição química, biodisponibilidade e segurança terapêutica auditadas pela ANVISA, com economia média de até 65%.`,
    },
    susAvailability: {
      isFreeInSUS: true,
      badgeText: "Disponível na Rede Básica do SUS (UBS)",
      instructions: "Verifique a disponibilidade na farmácia da Unidade Básica de Saúde (UBS) do seu bairro portando receita médica válida, Cartão SUS e documento com foto.",
      requiresPrescription: true,
    },
    farmaciaPopular: {
      isEligible: false,
      statusType: "nao_coberto",
      badgeText: "Consulte gratuidade no posto de saúde (UBS)",
      conditionName: "Atenção Básica",
      instructions: "Consulte na farmácia da UBS do seu município para retirada gratuita ou solicite a versão genérica na drogaria particular.",
    },
    equivalentMedicines: [
      {
        type: "generico",
        name: `${capitalized} Genérico (Tarja Amarela)`,
        activeIngredient: capitalized,
        dosage: "Dosagem recomendada",
        badge: "Tarja Amarela ANVISA",
        savingsEstimated: "Até 65% de economia",
        description: "Genérico oficial certificado pela ANVISA.",
        recommended: true,
      },
      {
        type: "referencia",
        name: `${capitalized} (Marca de Referência)`,
        activeIngredient: capitalized,
        dosage: "Dosagem padrão",
        badge: "Marca de Referência",
        savingsEstimated: "Preço de Referência",
        description: "Marca original pioneira.",
        recommended: false,
      },
    ],
    quickTips: [
      "Tome sempre com um copo de água limpa e filtrada.",
      "Não interrompa nem altere a dose sem prévia orientação médica ou farmacêutica.",
      "Conserve em local fresco, seco e ao abrigo da luz solar direta.",
    ],
    anvisaRegulation: {
      bioequivalent: true,
      details: "Medicamento submetido às normas de Boas Práticas de Fabricação (BPF) regulamentadas pela ANVISA.",
    },
    disclaimer: "Aviso importante: Esta informação tem finalidade estritamente informativa. Nunca se automedique sem orientação profissional e consulte sempre o farmacêutico ou médico.",
  };
}

function buildDynamicFallbackSymptom(queryText: string): any {
  const cleanSymptom = (queryText || "Sintomas comuns")
    .trim()
    .replace(/[^\w\sáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ-]/gi, "");
  const formatted = cleanSymptom.charAt(0).toUpperCase() + cleanSymptom.slice(1);

  return {
    status: "success",
    symptomQuery: formatted,
    clinicalOverview: `Os sintomas relatados (${formatted}) são frequentes na atenção primária à saúde e costumam responder favoravelmente a repouso, hidratação adequada e analgésicos ou antitérmicos seguros de venda livre. Caso os sintomas persistam por mais de 48 horas, procure atendimento médico na UBS ou UPA.`,
    recommendedMedicines: [
      {
        referenceName: "Dipirona Monoidratada (Novalgina® / Anador®)",
        activeIngredient: "Dipirona Monoidratada",
        dosage: "500 mg a 1.000 mg a cada 6 a 8 horas (adultos)",
        whyItHelps: "Analgésico e antitérmico potente de ação rápida no alívio de dores moderadas e controle da febre.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Item essencial distribuído gratuitamente em qualquer UBS do SUS portando Cartão SUS.",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Dipirona Monoidratada 500mg com tarja amarela?",
        precautions: "Contraindicada para quem possui alergia a pirazolonas ou pressão arterial muito baixa.",
      },
      {
        referenceName: "Paracetamol (Tylenol®)",
        activeIngredient: "Paracetamol",
        dosage: "500 mg a 750 mg a cada 6 horas",
        whyItHelps: "Analgésico suave no estômago, seguro para quem tem gastrite ou não tolera dipirona.",
        susAvailability: {
          status: "gratuito_sus",
          badgeText: "🟢 100% Gratuito no Posto de Saúde / UBS",
          instructions: "Disponível sem custo em todas as Unidades Básicas de Saúde (RENAME/SUS).",
          requiresPrescription: false,
        },
        howToAskAtCounter: "Por favor, você tem o genérico de Paracetamol 750mg?",
        precautions: "Nunca ultrapasse 4g (4.000mg) ao dia para não sobrecarregar o fígado.",
      },
    ],
    warningSigns: [
      "Febre persistente acima de 39°C que não responde a antitérmicos",
      "Dor de cabeça súbita, severa e acompanhada de vômitos ou rigidez na nuca",
      "Falta de ar progressiva, dor no peito ou lábios arroxeados",
      "Sonolência excessiva, confusão mental ou incapacidade de ingerir líquidos",
    ],
    homeCareTips: [
      "Mantenha repouso adequado em ambiente calmo e bem arejado",
      "Hidrate-se com bastante água, chás claros e água de coco",
      "Prefira alimentos leves e nutritivos, evitando frituras e alimentos ultraprocessados",
    ],
    disclaimer: "Aviso importante: Esta orientação tem caráter estritamente educativo. Em caso de dúvidas, piora ou persistência dos sintomas, consulte um médico na UBS ou UPA.",
  };
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// GET fallback on analyze-medicine
app.get("/api/analyze-medicine", (_req, res) => {
  res.status(405).json({
    error: "Método GET não permitido. Utilize POST enviando o nome ou foto do medicamento.",
  });
});

// GET fallback on analyze-symptom
app.get("/api/analyze-symptom", (_req, res) => {
  res.status(405).json({
    error: "Método GET não permitido. Utilize POST enviando a descrição dos sintomas.",
  });
});

// API Route for Symptom analysis: "O que está sentindo -> Quais remédios pode tomar + SUS"
app.post("/api/analyze-symptom", async (req, res) => {
  try {
    const { symptom } = req.body || {};

    if (!symptom || typeof symptom !== "string" || !symptom.trim()) {
      return res.status(400).json({
        error: "Por favor, descreva o que você está sentindo (ex: dor de cabeça, febre, azia, dor nas costas).",
      });
    }

    const trimmedSymptom = symptom.trim();

    // Check if the user actually typed a medicine name (ex: "Dipirona", "Paracetamol", "Losartana")
    if (isMedicineQuery(trimmedSymptom)) {
      const directMedMatch = getLocalDatabaseMatch(trimmedSymptom);
      if (directMedMatch) {
        return res.json({ type: "medicine", data: directMedMatch });
      }
    }

    // Fast check on curated database
    const localMatch = getLocalSymptomMatch(trimmedSymptom);

    const systemInstruction = `Você é o médico clínico e consultor farmacêutico da "Farmácia Clara", uma plataforma voltada a orientar cidadãos brasileiros sobre o alívio seguro de sintomas comuns, indicando claramente QUAIS REMÉDIOS ELES PODEM TOMAR e se esses medicamentos podem ser retirados GRATUITAMENTE NO SUS (Posto de Saúde/UBS ou Farmácia Popular) ou comprados como GENÉRICOS TARJA AMARELA econômicos.

DIRETRIZES FUNDAMENTAIS:
1. QUAIS REMÉDIOS A PESSOA PODE TOMAR:
- Forneça de 2 a 4 opções seguras de remédios para o sintoma relatado, priorizando Medicamentos Isentos de Prescrição (MIPs) ou terapias de primeira linha amplamente utilizadas no Brasil.
- Para cada remédio:
  * Nome comercial de referência conhecido (ex: Tylenol, Novalgina, Buscopan, Omeprazol, Dorflex).
  * Princípio Ativo oficial (DCB da ANVISA, ex: Paracetamol, Dipirona Monoidratada, etc.).
  * Dosagem usual para adultos (ex: 500mg a 750mg).
  * Por que ajuda: como age diretamente no alívio daquela queixa específica.
  * Disponibilidade no SUS:
    - 'gratuito_sus': se é distribuído gratuitamente pelo SUS na UBS ou no Farmácia Popular (ex: Dipirona, Paracetamol, Ibuprofeno, Omeprazol, Loratadina, Soro de Reidratação Oral).
    - 'copagamento': se tem até 90% de desconto no programa Farmácia Popular (ex: Budesonida, etc.).
    - 'particular_generico': se não consta no rol gratuito federal, mas possui genérico barato com tarja amarela na drogaria.
  * Instrução de retirada no SUS ou compra com genérico.
  * Como pedir no balcão da farmácia (frase pronta entre aspas).
  * Cuidados e contraindicações básicas.

2. SEGURANÇA CLÍNICA E SINAIS DE ALERTA:
- Liste 3 a 5 sinais de alarme claros nos quais o paciente deve procurar atendimento médico de urgência (UPA ou Pronto-Socorro) imediatamente.
- Indique cuidados caseiros complementares (hidratação, repouso, compressas).
- Mantenha tom acolhedor, objetivo, humanizado e extremamente responsável.

3. ADVERTÊNCIA LEGAL:
- "Aviso importante: Esta orientação tem caráter estritamente informativo e educativo. Não substitui consulta médica ou diagnóstico presencial. Em caso de persistência dos sintomas ou agravamento, procure uma UBS ou UPA."`;

    // Try Gemini model chain: gemini-3.1-flash-lite -> gemini-3.6-flash -> gemini-flash-latest
    const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.6-flash", "gemini-flash-latest"];

    for (const modelName of candidateModels) {
      try {
        const ai = getGenAI();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout após 4.5s")), 4500)
        );

        const response: any = await Promise.race([
          ai.models.generateContent({
            model: modelName,
            contents: `O usuário relatou o seguinte sintoma ou mal-estar: "${trimmedSymptom}". Analise a queixa clínica, explique o quadro em linguagem simples e informe detalhadamente quais remédios ele pode tomar para aliviar o problema, com indicação precisa de gratuidade no SUS / Farmácia Popular ou economia com genérico tarja amarela, dosagens usuais, como pedir no balcão, cuidados e sinais de alarme médico.`,
            config: {
              systemInstruction,
              temperature: 0.2,
              responseMimeType: "application/json",
              responseSchema: symptomAnalysisResponseSchema,
            },
          }),
          timeoutPromise,
        ]);

        const responseText = response?.text;
        if (responseText) {
          const parsedData = JSON.parse(responseText);
          return res.json(parsedData);
        }
      } catch (modelErr: any) {
        console.warn(`[Farmácia Clara - Sintomas] Modelo ${modelName} falhou:`, modelErr?.message || modelErr);
      }
    }

    // Fallback to local curated symptoms database
    if (localMatch) {
      return res.json(localMatch);
    }

    // Dynamic resilient fallback
    return res.json(buildDynamicFallbackSymptom(trimmedSymptom));
  } catch (error: any) {
    console.error("[Farmácia Clara] Erro em /api/analyze-symptom:", error);
    return res.status(500).json({
      error: "Ocorreu um erro interno ao analisar seus sintomas. Tente novamente.",
    });
  }
});

// API Route for medicine analysis
app.post("/api/analyze-medicine", async (req, res) => {
  try {
    const { text, imageBase64, imageMimeType } = req.body || {};

    if (!text && !imageBase64) {
      return res.status(400).json({
        error: "Por favor, digite o nome de um medicamento ou envie uma foto da receita/caixa.",
      });
    }

    const systemInstruction = `Você é o assistente farmacêutico e especialista em economia de saúde da "Farmácia Clara", uma plataforma brasileira voltada para ajudar cidadãos a economizarem na compra de medicamentos através de genéricos e do programa Farmácia Popular regulamentados pela ANVISA.

Seu compromisso primordial é a SEGURANÇA DO PACIENTE e a PRECISÃO FARMACOLÓGICA.

Diretrizes obrigatórias:
1. IDENTIFICAÇÃO E DCB:
- Identifique com precisão o medicamento de referência ou princípio ativo na Denominação Comum Brasileira (DCB) da ANVISA e a dosagem padrão ou especificada.
- QUAIS REMÉDIOS VOCÊ PODE TOMAR (equivalentMedicines): Liste as opções equivalentes seguras que o paciente pode tomar: o Genérico oficial (com tarja amarela e letra 'G'), Similares Intercambiáveis aprovados pela ANVISA e a marca de referência.
- CAMPO 'purpose' (BREVE DESCRIÇÃO): Seja BEM BREVE (máximo 1 a 2 frases). Diga diretamente: para o que o remédio é utilizado e o que ele resolve (ex: "Serve para controlar a pressão arterial e regularizar os batimentos, prevenindo infartos" ou "Alivia a queimação e dor de estômago, cicatrizando gastrite e refluxo"). Seja simples, direto e sem jargões desnecessários.

2. SEGURANÇA E ILEGIBILIDADE (CRÍTICO EM RECEITAS MÉDICAS):
- Se o usuário enviou uma imagem (foto de receita manuscrita ou embalagem cortada) e o texto estiver borrado, ilegível, com letra médica ambígua ou duvidosa:
  * NUNCA ADIVINHE nem chute um medicamento!
  * Retorne status: "illegible".
  * Em illegibleMessage, seja atencioso e empático, explicando que para a segurança dele, a caligrafia da receita não permitiu confirmação segura, e peça que ele digite o nome que o médico prescreveu ou tire uma foto mais próxima, focada e bem iluminada.

3. PROGRAMA FARMÁCIA POPULAR:
- Conheça as regras atuais do programa Farmácia Popular do Brasil:
  * Gratuidade total (100% gratuito) para: Hipertensão (ex: Losartana, Atenolol, Captopril, Hidroclorotiazida, Propranolol, Enalapril), Diabetes (ex: Metformina, Glibenclamida, Insulinas), Asma (ex: Salbutamol, Beclometasona, Ipratrópio), Osteoporose (Alendronato de Sódio), Anticoncepcionais e beneficiários do Bolsa Família.
  * Co-pagamento (com até 90% de desconto) para outros itens do rol como colesterol (Sinvastatina), rinite (Budesonida), glaucoma (Timolol), etc.
  * Para medicamentos que não constam na lista oficial do Farmácia Popular, informe statusType: "nao_coberto".

4. COMO ECONOMIZAR E PEDIR NO BALCÃO:
- Formule uma instrução prática e clara: "Como pedir no balcão da farmácia".
- Explique o símbolo da tarja amarela oficial com a letra maiúscula 'G' e o texto 'Medicamento Genérico - Lei 9.787/99'.
- Indique a economia estimada (geralmente entre 35% e 70% em relação aos de referência de marca).

5. RODAPÉ DE SEGURANÇA OBRIGATÓRIO:
- O disclaimer deve conter: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de trocar medicações."`;

    let contentsPayload: any;

    if (imageBase64) {
      const cleanBase64 = String(imageBase64).replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");
      const mimeType = imageMimeType || "image/jpeg";

      contentsPayload = {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: text
              ? `Analise esta imagem (receita médica ou caixa de medicamento) juntamente com a observação: "${text}". Identifique o medicamento, princípio ativo (DCB), dosagem, quais remédios equivalentes (genéricos) o paciente pode tomar e elegibilidade na Farmácia Popular e ANVISA. Se a caligrafia estiver ilegível, retorne status 'illegible'.`
              : `Analise esta foto de receita médica ou caixa de medicamento. Faça o OCR com máxima cautela e identifique o medicamento de referência, princípio ativo (DCB), dosagem, quais remédios equivalentes o paciente pode tomar e se há genérico e Farmácia Popular. Se a caligrafia for ambígua ou ilegível, não adivinhe: retorne status 'illegible'.`,
          },
        ],
      };
    } else {
      contentsPayload = `Analise o seguinte medicamento informado pelo usuário: "${text}". Identifique o medicamento de referência correspondente, o princípio ativo oficial (DCB da ANVISA), dosagem comum, quais remédios equivalentes (genéricos com tarja amarela e similares) o paciente pode tomar, como pedir no balcão, percentual de economia e elegibilidade no programa Farmácia Popular do Brasil.`;
    }

    // Fast check: if text matches common database and user didn't provide an image
    if (text && !imageBase64) {
      const directMatch = getLocalDatabaseMatch(text);
      if (directMatch) {
        return res.json(directMatch);
      }
    }

    // Model fallback chain
    const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    const timeoutDuration = imageBase64 ? 9000 : 4500;

    for (const modelName of candidateModels) {
      try {
        const ai = getGenAI();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout após ${timeoutDuration}ms`)), timeoutDuration)
        );

        const response: any = await Promise.race([
          ai.models.generateContent({
            model: modelName,
            contents: contentsPayload,
            config: {
              systemInstruction,
              temperature: 0.2,
              responseMimeType: "application/json",
              responseSchema: analysisResponseSchema,
            },
          }),
          timeoutPromise,
        ]);

        const responseText = response?.text;
        if (responseText) {
          const parsedData = JSON.parse(responseText);
          return res.json(parsedData);
        }
      } catch (modelErr: any) {
        console.warn(`[Farmácia Clara] Modelo ${modelName} falhou:`, modelErr?.message || modelErr);
      }
    }

    // If text query and models failed, check curated Brazilian knowledge base
    if (text) {
      const localMatch = getLocalDatabaseMatch(text);
      if (localMatch) {
        return res.json(localMatch);
      }
      return res.json(buildDynamicFallbackMedicine(text));
    }

    // Return user-friendly response
    return res.status(503).json({
      error: "O serviço de inteligência artificial da ANVISA está com alta demanda momentânea. Por favor, tente novamente em alguns instantes.",
    });
  } catch (error: any) {
    console.error("[Farmácia Clara] Erro não tratado em /api/analyze-medicine:", error);
    return res.status(500).json({
      error: "Ocorreu um erro interno no servidor ao analisar o medicamento. Tente novamente.",
    });
  }
});

// Unified Search Route: handles both medicine queries and symptom queries
app.post("/api/search", async (req, res) => {
  try {
    const { query, text, imageBase64, imageMimeType } = req.body || {};
    const textQuery = (typeof query === "string" && query.trim()) || (typeof text === "string" && text.trim()) || "";

    if (!textQuery && !imageBase64) {
      return res.status(400).json({
        error: "Por favor, digite o nome do medicamento (ex: Dipirona) ou o que está sentindo (ex: Dor de cabeça).",
      });
    }

    // 1. If image provided or query matches medicine name/keywords
    if (imageBase64 || isMedicineQuery(textQuery)) {
      // Check local curated database first for lightning-fast, high-quality match
      if (textQuery && !imageBase64) {
        const localMed = getLocalDatabaseMatch(textQuery);
        if (localMed) {
          return res.json({ type: "medicine", data: localMed });
        }
      }

      // If not in local database, call Gemini with medicine schema
      try {
        let contentsPayload: any;

        if (imageBase64) {
          const cleanBase64 = String(imageBase64).replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");
          contentsPayload = {
            parts: [
              { inlineData: { mimeType: imageMimeType || "image/jpeg", data: cleanBase64 } },
              { text: textQuery ? `Analise esta imagem junto com "${textQuery}". Identifique o remédio, genéricos, dosagem, SUS e cuidados.` : `Analise esta foto de receita ou caixa. Identifique o remédio, genéricos, dosagem, SUS e cuidados.` },
            ],
          };
        } else {
          contentsPayload = `Analise o seguinte medicamento informado pelo usuário: "${textQuery}". Forneça informações completas e de alta qualidade: princípio ativo (DCB), para que serve (purpose), posologia/dosagem segura para adultos (dosageInfo), cuidados e contraindicações (precautions), disponibilidade gratuita no SUS (susAvailability), genéricos oficiais com tarja amarela e marcas de referência (equivalentMedicines), como pedir no balcão (howToAsk), e dicas de uso (quickTips).`;
        }

        const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
        const searchTimeoutMs = imageBase64 ? 9000 : 4500;

        for (const modelName of candidateModels) {
          try {
            const ai = getGenAI();
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout após ${searchTimeoutMs}ms`)), searchTimeoutMs)
            );

            const response: any = await Promise.race([
              ai.models.generateContent({
                model: modelName,
                contents: contentsPayload,
                config: {
                  systemInstruction: `Você é o farmacêutico clínico da "Farmácia Clara". Seu compromisso é orientar sobre medicamentos no Brasil: princípio ativo, para que serve, dosagem correta, cuidados, disponibilidade gratuita no SUS e genéricos tarja amarela.`,
                  temperature: 0.2,
                  responseMimeType: "application/json",
                  responseSchema: analysisResponseSchema,
                },
              }),
              timeoutPromise,
            ]);

            const responseText = response?.text;
            if (responseText) {
              const parsedData = JSON.parse(responseText);
              return res.json({ type: "medicine", data: parsedData });
            }
          } catch {
            // try next model
          }
        }
      } catch (geminiErr) {
        console.warn("[Farmácia Clara] Erro ao consultar medicamento via Gemini:", geminiErr);
      }

      // If image was provided but could not be deciphered
      if (imageBase64 && (!textQuery || textQuery.includes("Foto de receita"))) {
        return res.json({
          type: "medicine",
          data: {
            status: "illegible",
            commercialName: "Medicamento não identificado na foto",
            activeIngredient: "Não identificado",
            dosage: "Sob consulta médica",
            purpose: "Não foi possível ler com clareza o nome do medicamento na imagem enviada.",
            howToAsk: "Leve a receita original física ao balcão da farmácia para conferência pelo farmacêutico responsável.",
            tarjaAmarelaInfo: {
              badgeText: "Consulte o Farmacêutico",
              savingsPercentRange: "Até 70%",
              explanation: "Ao chegar à farmácia, mostre a receita e pergunte se há genérico tarja amarela disponível.",
            },
            farmaciaPopular: {
              isEligible: false,
              statusType: "nao_coberto",
              badgeText: "Conferir Receita",
              instructions: "Apresente a receita médica válida e CPF na farmácia credenciada.",
            },
            anvisaRegulation: {
              bioequivalent: false,
              details: "Para sua segurança, medicamentos só devem ser trocados quando a prescrição estiver 100% legível.",
            },
            disclaimer: "Aviso importante: Esta ferramenta tem caráter estritamente informativo. Consulte sempre o farmacêutico no balcão e seu médico antes de tomar ou trocar qualquer medicamento.",
            illegibleMessage: "A fotografia da receita ou caixa não permitiu uma leitura segura do nome do medicamento. Por favor, digite o nome do remédio ou tire uma nova foto mais próxima, focada e bem iluminada.",
          },
        });
      }

      // Check local DB match fallback or generate rich dynamic medicine analysis
      if (textQuery) {
        const localMed = getLocalDatabaseMatch(textQuery);
        if (localMed) {
          return res.json({ type: "medicine", data: localMed });
        }
        return res.json({ type: "medicine", data: buildDynamicFallbackMedicine(textQuery) });
      }
    }

    // 2. Default or Symptom Query: analyze symptom
    if (textQuery) {
      const localSymptom = getLocalSymptomMatch(textQuery);
      if (localSymptom) {
        return res.json({ type: "symptom", data: localSymptom });
      }
    }

    // Call Gemini for symptom analysis
    try {
      const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.6-flash", "gemini-flash-latest"];
      const symptomSystemInstruction = `Você é o médico clínico e consultor farmacêutico da "Farmácia Clara", uma plataforma voltada a orientar cidadãos brasileiros sobre o alívio seguro de sintomas comuns, indicando claramente QUAIS REMÉDIOS ELES PODEM TOMAR e se esses medicamentos podem ser retirados GRATUITAMENTE NO SUS (Posto de Saúde/UBS ou Farmácia Popular) ou comprados como GENÉRICOS TARJA AMARELA econômicos.`;

      for (const modelName of candidateModels) {
        try {
          const ai = getGenAI();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout após 4.5s")), 4500)
          );

          const response: any = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents: `O usuário relatou: "${textQuery}". Analise a queixa clínica e informe detalhadamente quais remédios ele pode tomar, com indicação de gratuidade no SUS / Farmácia Popular, genéricos tarja amarela, dosagens usuais, como pedir no balcão e sinais de alarme médico.`,
              config: {
                systemInstruction: symptomSystemInstruction,
                temperature: 0.2,
                responseMimeType: "application/json",
                responseSchema: symptomAnalysisResponseSchema,
              },
            }),
            timeoutPromise,
          ]);

          const responseText = response?.text;
          if (responseText) {
            const parsedData = JSON.parse(responseText);
            return res.json({ type: "symptom", data: parsedData });
          }
        } catch {
          // try next model
        }
      }
    } catch (geminiErr) {
      console.warn("[Farmácia Clara] Erro ao consultar sintoma via Gemini:", geminiErr);
    }

    // Fallbacks: local curated match or dynamic generator
    if (textQuery) {
      const localSymptom = getLocalSymptomMatch(textQuery);
      if (localSymptom) {
        return res.json({ type: "symptom", data: localSymptom });
      }
      const localMed = getLocalDatabaseMatch(textQuery);
      if (localMed) {
        return res.json({ type: "medicine", data: localMed });
      }

      // Check if it looks more like medicine or symptom
      if (isMedicineQuery(textQuery)) {
        return res.json({ type: "medicine", data: buildDynamicFallbackMedicine(textQuery) });
      }
      return res.json({ type: "symptom", data: buildDynamicFallbackSymptom(textQuery) });
    }

    return res.status(400).json({
      error: "Por favor, digite o nome do medicamento ou descreva o que está sentindo.",
    });
  } catch (error: any) {
    console.error("[Farmácia Clara] Erro em /api/search:", error);
    return res.status(500).json({
      error: "Ocorreu um erro interno ao processar sua consulta. Tente novamente.",
    });
  }
});

// Explicit barrier: ANY /api route not matched above MUST return JSON 404 and NEVER fall through to Vite SPA index.html
app.all("/api*", (_req, res) => {
  res.status(404).json({ error: "Endpoint da API não encontrado." });
});

// Global Express error handler returning JSON, never HTML
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Farmácia Clara] Express Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Erro interno do servidor.",
  });
});

// Start server with Vite middleware in dev or static serving in prod
async function startServer() {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Farmácia Clara] Servidor rodando na porta ${PORT}`);
  });
}

startServer();
