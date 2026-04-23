import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Loader2, FileText, MessageSquare, Sparkles, LayoutTemplate, Target, Users, Palette, Settings, Key, Save, X } from 'lucide-react';

const getAiClient = (key?: string) => {
  const apiKey = key || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

const systemInstruction = `
# Persona e Objetivo
Você é o **innovation architect AI**, um especialista sênior em Gestão de Produtos e Inovação da **delaware**.

# Comportamento e Tom de Voz (Marca delaware)
- **Tom:** Claro, direto, humano, confiante e calmo.
- **Estilo:** Prefira minúsculas para manchetes e frases de ênfase. Use "delaware" sempre em minúsculas.
- **Tagline:** Use "nós nos comprometemos. Nós entregamos." quando apropriado.
- **Profissional e Consultivo:** Você não apenas escreve o que o usuário pede, mas questiona e melhora.
- **Estruturado:** Use tabelas para organizar informações complexas e Markdown para formatar.

# Fluxo de Trabalho do Aplicativo
Sempre que o usuário iniciar um novo projeto, siga estas etapas:
1. **Coleta de Dados Iniciais:** Pergunte o Nome do Projeto, Objetivo Principal e Público.
2. **Geração do PRD Estruturado:** Gere o documento seguindo rigorosamente as seções:
 - **Visão Geral e Contexto:** Resumo executivo e "Elevator Pitch".
 - **O "Porquê" (Problema e Objetivos):** Detalhamento da dor do usuário e KPIs.
 - **Personas e User Stories:** Mínimo de 3 personas detalhadas e 10 user stories.
 - **Requisitos Funcionais (MoSCoW):** Tabela com funcionalidades priorizadas.
 - **Requisitos Não-Funcionais:** Performance, Segurança, Escalabilidade.
 - **Design e Experiência do Usuário (UX/UI):** Princípios, Paleta de Cores (OBRIGATÓRIO usar o Padrão delaware), Referências.
 - **Requisitos Técnicos e Integrações:** Stack Sugerida, APIs, Dependências.
 - **Cronograma e Fases (Roadmap):** Fase 1 (MVP), Fase 2 e Além, Marcos.
 - **Riscos e Premissas:** Riscos Técnicos/Negócio, Premissas.
 - **Apêndice e Referências:** Links, benchmarks.
3. **Refinamento:** Após gerar o PRD, pergunte: "Deseja aprofundar em alguma seção específica?"

# Paleta de Cores OBRIGATÓRIA (Padrão delaware)
Você DEVE utilizar exclusivamente estas cores na seção de Design e UX/UI:
- **Primary Red:** #c42828 (Headers, botões primários, ícones de marca)
- **Dot Red:** #ef463c (Notificações, estados ativos, CTAs secundários)
- **Sub Red 1:** #ee7684 (Ilustrações, backgrounds suaves)
- **Sub Red 2:** #941914 (Textos em fundos claros, bordas)
- **Teal:** #72c4bf (Sucesso, confirmação, elementos de dados)
- **Purple:** #ad9bcb (Destaques informativos, categorias especiais)
- **Text Gray:** #3c3c3c (Texto principal, títulos)
- **Mid Gray:** #999999 (Textos secundários, placeholders)
- **Light Gray:** #f5f5f5 (Planos de fundo, cards)

# Sincronização Chat -> PRD
Sempre que o usuário solicitar uma alteração no PRD ou você sugerir uma melhoria que altere o documento, você DEVE incluir no final da sua resposta um bloco de código Markdown especial com o conteúdo COMPLETO e ATUALIZADO do PRD. 
O bloco deve começar exatamente com \`\`\`UPDATED_PRD e terminar com \`\`\`.
`;

export default function App() {
  const [activeTab, setActiveTab] = useState<'prd' | 'chat'>('prd');
  const [isGenerating, setIsGenerating] = useState(false);
  const [prdContent, setPrdContent] = useState('');
  
  const [projectName, setProjectName] = useState('');
  const [objective, setObjective] = useState('');
  const [audience, setAudience] = useState('');

  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('GEMINI_API_KEY') || '');
  const [tempApiKey, setTempApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generatePRD = async () => {
    if (!projectName || !objective || !audience) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    const client = getAiClient(userApiKey);
    if (!client) {
      setShowSettings(true);
      alert("Por favor, configure sua chave de API da Gemini nas configurações.");
      return;
    }

    setIsGenerating(true);
    setActiveTab('prd');
    setPrdContent('');
    setMessages([]);

    const prompt = `
Quero criar um novo projeto.
Nome: ${projectName}
Objetivo: ${objective}
Público: ${audience}
Paleta de Cores: PADRÃO DELAWARE (FIXO)

Por favor, gere o PRD completo em formato Markdown conforme as instruções do sistema, aplicando obrigatoriamente a paleta de cores Delaware.
    `;

    try {
      const response = await client.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      let fullText = '';
      for await (const chunk of response) {
        if (chunk.text) {
          fullText += chunk.text;
          setPrdContent(fullText);
        }
      }

      setMessages([
        { role: 'user', text: prompt },
        { role: 'model', text: fullText }
      ]);

    } catch (error) {
      console.error("Error generating PRD:", error);
      alert("Ocorreu um erro ao gerar o PRD.");
    } finally {
      setIsGenerating(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isChatting) return;

    const client = getAiClient(userApiKey);
    if (!client) {
      setShowSettings(true);
      alert("Por favor, configure sua chave de API da Gemini nas configurações.");
      return;
    }

    const userMsg = inputMessage;
    setInputMessage('');
    
    const newMessages = [...messages, { role: 'user' as const, text: userMsg }];
    setMessages(newMessages);
    setIsChatting(true);

    try {
      const contents = newMessages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      const response = await client.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      let fullText = '';
      for await (const chunk of response) {
        if (chunk.text) {
          fullText += chunk.text;
          
          // Check for UPDATED_PRD block
          let chatDisplayMsg = fullText;
          const prdStartIndex = fullText.indexOf('```UPDATED_PRD');
          
          if (prdStartIndex !== -1) {
            // Hide the block from the chat display as soon as it starts
            chatDisplayMsg = fullText.substring(0, prdStartIndex).trim();
            
            // Extract content if the block is finished
            const prdEndIndex = fullText.indexOf('```', prdStartIndex + 14);
            if (prdEndIndex !== -1) {
              const updatedPrd = fullText.substring(prdStartIndex + 14, prdEndIndex).trim();
              setPrdContent(updatedPrd);
            }
          }

          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].text = chatDisplayMsg || 'Atualizando PRD...';
            return updated;
          });
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Desculpe, ocorreu um erro ao processar sua mensagem." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const downloadPRD = () => {
    const date = new Date().toLocaleDateString('pt-BR');
    const author = "nnetox@gmail.com";
    const version = "1.0";
    const batchName = "innovation hub batch";

    const template = `
# delaware

## ${batchName}
## ${projectName}

**Date:** ${date}
**Version:** ${version}

---

### Approval for use
| delaware | Name | Signature | Date |
| --- | --- | --- | --- |
| Setup by: | ${author} | | ${date} |
| Approved by: | | | |

---

### Data classification
- [ ] Public
- [x] Internal Use
- [ ] Confidential
- [ ] Strictly Confidential

---

### Change history
| Version | Date | Description |
| --- | --- | --- |
| ${version} | ${date} | Initial PRD generation and refinement |

---

### Contents
${prdContent.match(/^#+ .+/gm)?.map((h, i) => `${i + 1}. ${h.replace(/^#+ /, '')}`).join('\n') || 'Ver seções abaixo'}

---

${prdContent}

---
*nós nos comprometemos. Nós entregamos.*
    `;

    const blob = new Blob(["\ufeff", template], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // Sanitize filename to be safe for all browsers
    const safeProjectName = projectName.trim() 
      ? projectName.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '_').toLowerCase() 
      : 'documento';
    
    a.style.display = 'none';
    a.href = url;
    a.download = `prd_${safeProjectName}.md`;
    
    document.body.appendChild(a);
    a.click();
    
    // Small delay before cleanup to ensure Chrome processes the download request
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const saveApiKey = () => {
    localStorage.setItem('GEMINI_API_KEY', tempApiKey);
    setUserApiKey(tempApiKey);
    setShowSettings(false);
  };

  return (
    <div className="min-h-screen bg-light-gray text-text-gray font-sans flex flex-col md:flex-row">
      {showSettings && (
        <div className="fixed inset-0 bg-[#3c3c3c]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md shadow-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary-red" />
                <h2 className="text-lg font-display font-medium text-text-gray lowercase">configurações</h2>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-mid-gray hover:text-text-gray transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-text-gray mb-3 lowercase">
                  <Key className="w-4 h-4 text-primary-red" />
                  chave de api gemini
                </label>
                <input 
                  type="password"
                  className="w-full px-4 py-3 bg-light-gray border border-transparent rounded-sm focus:ring-2 focus:ring-primary-red focus:bg-white outline-none transition-all text-sm"
                  placeholder="Cole sua chave aqui..."
                  value={tempApiKey}
                  onChange={e => setTempApiKey(e.target.value)}
                />
                <p className="text-[10px] text-mid-gray mt-3 lowercase">
                  sua chave será salva localmente no navegador para não ser exposta no código.
                </p>
              </div>
              <button 
                onClick={saveApiKey}
                className="w-full bg-primary-red hover:bg-sub-red-2 text-white font-medium py-4 px-6 rounded-md flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span className="lowercase">salvar configuração</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Form */}
      <aside className="w-full md:w-1/3 lg:w-1/4 bg-white border-r border-gray-200 flex flex-col h-screen z-10">
        <div className="p-8 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <img src="/logo.svg" alt="delaware logo" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
            <h1 className="text-xl font-display font-medium tracking-tight text-text-gray lowercase">innovation hub</h1>
          </div>
          <p className="text-sm text-mid-gray lowercase">product requirements document</p>
        </div>
        
        <div className="p-8 space-y-6 flex-1 overflow-y-auto">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-gray mb-2 lowercase">
              <LayoutTemplate className="w-4 h-4 text-primary-red" />
              nome do projeto
            </label>
            <input 
              className="w-full px-4 py-3 bg-light-gray border border-transparent rounded-sm focus:ring-2 focus:ring-primary-red focus:bg-white outline-none transition-all text-sm"
              placeholder="Ex: Especificação Funcional"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-gray mb-2 lowercase">
              <Target className="w-4 h-4 text-primary-red" />
              objetivo principal
            </label>
            <textarea 
              className="w-full px-4 py-3 bg-light-gray border border-transparent rounded-sm focus:ring-2 focus:ring-primary-red focus:bg-white outline-none transition-all text-sm min-h-[120px] resize-none"
              placeholder="Ex: Gerar especificação funcional de GAPs em projetos de implementação SAP S/4HANA Private ou Public Cloud"
              value={objective}
              onChange={e => setObjective(e.target.value)}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-gray mb-2 lowercase">
              <Users className="w-4 h-4 text-primary-red" />
              público-alvo
            </label>
            <textarea 
              className="w-full px-4 py-3 bg-light-gray border border-transparent rounded-sm focus:ring-2 focus:ring-primary-red focus:bg-white outline-none transition-all text-sm min-h-[100px] resize-none"
              placeholder="Ex: Consultores técnicos e funcionais"
              value={audience}
              onChange={e => setAudience(e.target.value)}
            />
          </div>
        </div>
        
        <div className="p-8 border-t border-gray-100 bg-white space-y-3">
          <button 
            onClick={() => {
              setTempApiKey(userApiKey);
              setShowSettings(true);
            }}
            className="w-full border border-gray-200 hover:bg-light-gray text-text-gray font-medium py-3 px-6 rounded-md flex items-center justify-center gap-2 transition-all text-xs"
          >
            <Settings className="w-4 h-4 text-primary-red" />
            <span className="lowercase">configurar api ia</span>
          </button>
          <button 
            onClick={generatePRD}
            disabled={isGenerating || !projectName || !objective || !audience}
            className="w-full bg-primary-red hover:bg-sub-red-2 text-white font-medium py-4 px-6 rounded-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
            <span className="lowercase">{isGenerating ? 'processando...' : 'gerar prd completo'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-light-gray">
        {/* Tabs Header */}
        <header className="bg-white border-b border-gray-200 px-8 pt-6 flex justify-between items-center z-0">
          <div className="flex gap-10">
            <button 
              onClick={() => setActiveTab('prd')}
              className={`font-medium text-sm pb-6 border-b-2 transition-all flex items-center gap-2 lowercase ${activeTab === 'prd' ? 'border-primary-red text-primary-red' : 'border-transparent text-mid-gray hover:text-text-gray'}`}
            >
              <FileText className="w-4 h-4" />
              documento prd
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`font-medium text-sm pb-6 border-b-2 transition-all flex items-center gap-2 lowercase ${activeTab === 'chat' ? 'border-primary-red text-primary-red' : 'border-transparent text-mid-gray hover:text-text-gray'}`}
            >
              <MessageSquare className="w-4 h-4" />
              chat assistant
            </button>
          </div>
          
          {prdContent && (
            <button 
              onClick={downloadPRD}
              className="mb-6 bg-white hover:bg-light-gray text-text-gray text-xs font-medium py-2.5 px-5 rounded-sm border border-gray-200 flex items-center gap-2 transition-all lowercase"
            >
              <FileText className="w-3.5 h-3.5 text-primary-red" />
              baixar prd (.md)
            </button>
          )}
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'prd' ? (
            <div className="h-full overflow-y-auto p-6 md:p-10">
              <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-100 p-10 md:p-16 min-h-full">
                {prdContent ? (
                  <div className="prose prose-slate prose-headings:font-display prose-headings:font-medium prose-headings:text-text-gray prose-h1:text-3xl prose-h1:lowercase prose-h2:text-2xl prose-h2:mt-12 prose-h2:border-b prose-h2:pb-3 prose-h2:lowercase prose-a:text-primary-red prose-pre:bg-text-gray prose-pre:text-white prose-code:text-primary-red prose-code:bg-light-gray prose-code:px-1.5 prose-code:rounded prose-table:border-collapse prose-th:bg-light-gray prose-th:p-4 prose-th:border prose-th:border-gray-200 prose-td:p-4 prose-td:border prose-td:border-gray-200 max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{prdContent}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-mid-gray py-32">
                    <div className="w-24 h-24 bg-light-gray rounded-full flex items-center justify-center mb-8 border border-gray-100">
                      <FileText className="w-12 h-12 text-mid-gray/40" />
                    </div>
                    <h3 className="text-xl font-display font-medium text-text-gray mb-3 lowercase">nenhum documento gerado</h3>
                    <p className="text-center max-w-sm text-sm">Preencha os dados do projeto no painel lateral e clique em "gerar prd completo" para começar.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col max-w-4xl mx-auto w-full bg-white border-x border-gray-200">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-mid-gray">
                    <div className="w-24 h-24 bg-light-gray rounded-full flex items-center justify-center mb-8 border border-gray-100">
                      <MessageSquare className="w-12 h-12 text-mid-gray/40" />
                    </div>
                    <h3 className="text-xl font-display font-medium text-text-gray mb-3 lowercase">chat assistant</h3>
                    <p className="text-center max-w-sm text-sm">Gere o PRD primeiro para que o assistente tenha contexto do seu projeto, ou inicie uma conversa agora.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    if (idx === 0 && msg.role === 'user' && msg.text.includes('Quero criar um novo projeto')) {
                       return (
                         <div key={idx} className="flex justify-center my-8">
                           <span className="bg-light-gray text-mid-gray text-[10px] font-medium px-4 py-1.5 rounded-full tracking-wider uppercase">
                             projeto inicializado
                           </span>
                         </div>
                       );
                    }

                    return (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-md px-6 py-5 ${msg.role === 'user' ? 'bg-primary-red text-white rounded-tr-none' : 'bg-light-gray border border-gray-100 text-text-gray rounded-tl-none'}`}>
                          <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'prose-slate prose-p:leading-relaxed prose-pre:bg-text-gray prose-pre:text-white prose-pre:border-none prose-code:text-primary-red prose-code:bg-white/50 prose-code:px-1.5 prose-code:rounded'}`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Chat Input */}
              <div className="p-6 bg-white border-t border-gray-100">
                <div className="flex gap-4 items-end">
                  <textarea 
                    className="flex-1 px-5 py-4 bg-light-gray border border-transparent rounded-md focus:ring-2 focus:ring-primary-red focus:bg-white outline-none transition-all resize-none min-h-[56px] max-h-40 text-sm"
                    placeholder="Pergunte algo ou peça para detalhar uma seção..."
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={isChatting || messages.length === 0}
                    rows={1}
                  />
                  <button 
                    onClick={sendMessage}
                    disabled={isChatting || !inputMessage.trim() || messages.length === 0}
                    className="bg-primary-red hover:bg-sub-red-2 text-white p-4 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 shadow-sm"
                  >
                    {isChatting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-[10px] text-center text-mid-gray mt-4 lowercase">
                  a ia pode cometer erros. considere verificar informações importantes.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
