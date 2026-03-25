import React, { useState, useEffect, useRef, useCallback } from 'react';
import ExcelJS from 'exceljs';
import { GoogleGenAI } from '@google/genai';
import {
  Languages, Info, Trash2, Keyboard, Bot, Upload, Lightbulb, Check,
  Layers, RotateCcw, Brain, ThumbsUp, CheckCircle, Play, ChevronLeft,
  ChevronRight, Volume2, Pencil, Wand2, Book, X, BookOpen, MessageSquare
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type AppState = 'upload' | 'setup' | 'practice' | 'summary';

interface Stats {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('upload');
  const [cardsData, setCardsData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [remainingCards, setRemainingCards] = useState<any[][]>([]);
  const [initialTotalCards, setInitialTotalCards] = useState(0);
  const [stats, setStats] = useState<Stats>({ again: 0, hard: 0, good: 0, easy: 0 });
  const [exampleColumnIndex, setExampleColumnIndex] = useState(-1);
  const [courseColumnIndex, setCourseColumnIndex] = useState(-1);

  const [allCourses, setAllCourses] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [isRandomOrder, setIsRandomOrder] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showEasyStamp, setShowEasyStamp] = useState(false);

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');

  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ display: 'none' });
  const [selectedText, setSelectedText] = useState('');

  const stateRef = useRef({ appState, isFlipped, remainingCards, exampleColumnIndex, infoModalOpen, aiModalOpen });

  useEffect(() => {
    stateRef.current = { appState, isFlipped, remainingCards, exampleColumnIndex, infoModalOpen, aiModalOpen };
  }, [appState, isFlipped, remainingCards, exampleColumnIndex, infoModalOpen, aiModalOpen]);

  // Shuffle function (Fisher-Yates)
  const shuffleArray = (array: any[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  // Load progress
  useEffect(() => {
    const savedData = localStorage.getItem('flashcard_progress');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setCardsData(parsed.cardsData);
        setHeaders(parsed.headers);
        setRemainingCards(parsed.remainingCards);
        setInitialTotalCards(parsed.initialTotalCards);
        setStats(parsed.stats);
        setExampleColumnIndex(parsed.exampleColumnIndex);
        setCourseColumnIndex(parsed.courseColumnIndex || -1);
        setAllCourses(parsed.allCourses || []);
        setSelectedCourses(parsed.selectedCourses || []);
        setIsRandomOrder(parsed.isRandomOrder ?? true);

        if (parsed.remainingCards.length > 0) {
          setAppState('practice');
        } else {
          localStorage.removeItem('flashcard_progress');
        }
      } catch (e) {
        console.error("Failed to load progress", e);
        localStorage.removeItem('flashcard_progress');
      }
    }
  }, []);

  // Save progress
  useEffect(() => {
    if (appState === 'practice' && remainingCards.length > 0) {
      const progressData = {
        cardsData,
        headers,
        remainingCards,
        initialTotalCards,
        stats,
        exampleColumnIndex,
        courseColumnIndex,
        allCourses,
        selectedCourses,
        isRandomOrder
      };
      localStorage.setItem('flashcard_progress', JSON.stringify(progressData));
    }
  }, [appState, remainingCards, stats, cardsData, headers, initialTotalCards, exampleColumnIndex, courseColumnIndex, allCourses, selectedCourses, isRandomOrder]);

  const processData = (json: any[][]) => {
    if (json.length === 0) return;
    const firstRow = json[0];
    let rawRows = json.slice(1);
    let activeHeaders = firstRow;

    const processedRows: any[][] = [];
    const detectedLessons = new Set<string>();

    rawRows.forEach(row => {
      if (!row || row.length < 2) return;
      const category = row[0]?.toString().trim() || '未分類';
      const front = row[1]?.toString().trim() || '';

      if (front) {
        detectedLessons.add(category);
        processedRows.push([...row]);
      }
    });

    if (processedRows.length > 0) {
      setHeaders(activeHeaders);
      setCardsData(processedRows);

      // Detect Example column index among the back fields (index 3+)
      // Note: Since we updated the rendering, back fields start from Column 4 (idx 3)
      const exColIdx = activeHeaders.findIndex((h, idx) => idx >= 3 && h && (h.toString().includes('例句') || h.toString().toLowerCase().includes('example')));
      setExampleColumnIndex(exColIdx);

      const sortedLessons = Array.from(detectedLessons);
      setAllCourses(sortedLessons);
      setSelectedCourses(sortedLessons);
      setCourseColumnIndex(0); // Col 1 is now always the category

      setAppState('setup');
    } else {
      alert("檔案中沒有有效的單詞資料！請確保第二欄為單字正面。");
    }
  };

  const parseArrayBufferToJson = async (buffer: ArrayBuffer, fileName: string): Promise<any[][]> => {
    const isXlsx = fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls');
    if (isXlsx) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];
      const json: any[][] = [];
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        json.push(row.values as any[]);
      });
      // ExcelJS row.values is 1-indexed (index 0 is undefined), normalize:
      return json.map(row => (row as any[]).slice(1));
    } else {
      // CSV: decode as UTF-8 text and parse manually
      const text = new TextDecoder('utf-8').decode(buffer);
      return text.split('\n').filter(line => line.trim()).map(line => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') {
              current += '"';
              i++;
            } else if (ch === '"') {
              inQuotes = false;
            } else {
              current += ch;
            }
          } else {
            if (ch === '"') {
              inQuotes = true;
            } else if (ch === ',') {
              result.push(current.trim());
              current = '';
            } else {
              current += ch;
            }
          }
        }
        result.push(current.trim());
        return result;
      });
    }
  };

  const processFileData = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const json = await parseArrayBufferToJson(buffer, file.name);
    processData(json);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFileData(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFileData(file);
  };

  const loadLocalFile = async (fileName: string) => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}${fileName}`);
      if (!response.ok) throw new Error('File not found');
      const arrayBuffer = await response.arrayBuffer();
      const json = await parseArrayBufferToJson(arrayBuffer, fileName);
      processData(json);
    } catch (error) {
      console.error('Error loading local file:', error);
      alert('無法讀取範例檔案，請確認檔案是否存在。');
    }
  };

  const startPractice = (data = cardsData, isRandom = isRandomOrder) => {
    let filtered = [...data];
    if (courseColumnIndex !== -1 && selectedCourses.length > 0) {
      filtered = data.filter(row => selectedCourses.includes(row[courseColumnIndex]?.toString() || '未分類'));
    }

    if (isRandom) {
      filtered = shuffleArray(filtered);
    }

    setRemainingCards(filtered);
    setInitialTotalCards(filtered.length);
    setStats({ again: 0, hard: 0, good: 0, easy: 0 });
    setAppState('practice');
    setIsFlipped(false);
  };

  const clearProgress = () => {
    localStorage.removeItem('flashcard_progress');
  };

  const abortPractice = () => {
    if (window.confirm('確定要清除目前的學習進度並返回首頁嗎？\n您的統計數據與剩餘卡片將會重置。')) {
      clearProgress();
      setAppState('upload');
    }
  };

  const speakText = (text: string) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    window.speechSynthesis.speak(utterance);
  };

  // Speak when new card appears (only front)
  useEffect(() => {
    if (appState === 'practice' && remainingCards.length > 0 && !isFlipped && !isAnimating) {
      speakText(remainingCards[0][1]);
    }
  }, [remainingCards[0], appState, isFlipped, isAnimating]);

  const toggleFlip = () => {
    if (isAnimating) return;
    setIsFlipped(prev => !prev);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (window.getSelection()?.toString().trim().length || 0 > 0) return;
    toggleFlip();
  };

  const handleSrsAction = (e: React.MouseEvent | null, action: 'again' | 'hard' | 'good' | 'easy') => {
    if (e) e.stopPropagation();
    if (isAnimating || remainingCards.length === 0) return;

    const currentCard = remainingCards[0];
    const newRemaining = [...remainingCards];
    newRemaining.shift();

    const newStats = { ...stats };

    if (action === 'again') {
      newStats.again++;
      if (newRemaining.length > 0) {
        newRemaining.splice(1, 0, currentCard);
      } else {
        newRemaining.push(currentCard);
      }
      setRemainingCards(newRemaining);
      setStats(newStats);
      setIsFlipped(false);
    } else if (action === 'hard') {
      newStats.hard++;
      const mid = Math.floor(newRemaining.length / 2);
      newRemaining.splice(mid, 0, currentCard);
      setRemainingCards(newRemaining);
      setStats(newStats);
      setIsFlipped(false);
    } else if (action === 'good') {
      newStats.good++;
      newRemaining.push(currentCard);
      setRemainingCards(newRemaining);
      setStats(newStats);
      setIsFlipped(false);
    } else if (action === 'easy') {
      newStats.easy++;
      setIsAnimating(true);
      setShowEasyStamp(true);
      setIsFlipped(false);

      setTimeout(() => {
        setRemainingCards(newRemaining);
        setStats(newStats);
        setShowEasyStamp(false);
        setIsAnimating(false);
        if (newRemaining.length === 0) {
          setAppState('summary');
          clearProgress();
        }
      }, 800);
      return; // prevent immediate state check
    }

    if (newRemaining.length === 0) {
      setAppState('summary');
      clearProgress();
    }
  };

  const goPrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isAnimating || remainingCards.length <= 1) return;
    const newRemaining = [...remainingCards];
    const lastCard = newRemaining.pop()!;
    newRemaining.unshift(lastCard);
    setRemainingCards(newRemaining);
    setIsFlipped(false);
  };

  const goNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isAnimating || remainingCards.length <= 1) return;
    const newRemaining = [...remainingCards];
    const firstCard = newRemaining.shift()!;
    newRemaining.push(firstCard);
    setRemainingCards(newRemaining);
    setIsFlipped(false);
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { appState, isFlipped, remainingCards, exampleColumnIndex, infoModalOpen, aiModalOpen } = stateRef.current;

      if (appState !== 'practice' || remainingCards.length === 0) return;

      if (infoModalOpen || aiModalOpen) {
        if (e.key === 'Escape') {
          setInfoModalOpen(false);
          setAiModalOpen(false);
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        toggleFlip();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!isFlipped) {
          speakText(remainingCards[0][0]);
        } else if (exampleColumnIndex !== -1 && remainingCards[0][exampleColumnIndex]) {
          speakText(remainingCards[0][exampleColumnIndex]);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (isFlipped) {
        if (e.key === '1') { e.preventDefault(); handleSrsAction(null, 'again'); }
        if (e.key === '2') { e.preventDefault(); handleSrsAction(null, 'hard'); }
        if (e.key === '3') { e.preventDefault(); handleSrsAction(null, 'good'); }
        if (e.key === '4') { e.preventDefault(); handleSrsAction(null, 'easy'); }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Text selection tooltip
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('#selectionTooltip')) return;

      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim() || '';
        if (text.length > 0 && stateRef.current.isFlipped) {
          setSelectedText(text);
          const range = selection!.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          setTooltipStyle({
            display: 'flex',
            left: `${rect.left + rect.width / 2}px`,
            top: `${rect.top + window.scrollY - 10}px`,
            transform: 'translate(-50%, -100%)'
          });
        } else {
          setTooltipStyle({ display: 'none' });
        }
      }, 10);
    };

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        setTooltipStyle({ display: 'none' });
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const handleAIExplain = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedText) return;

    setTooltipStyle({ display: 'none' });
    setAiModalOpen(true);
    setAiLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `請以專業日文老師的角度，用繁體中文詳細解釋以下日文內容的字義與文法結構，並補充一個與職場或生活相關的實用例句：\n\n「${selectedText}」`,
        config: {
          systemInstruction: "你是一位精通日文與中文的親切語言教師，擅長用簡單易懂的方式解釋日文文法與單字。回答請條理分明，並使用適當的標記凸顯重點。"
        }
      });
      setAiResult(response.text || "AI 沒有回傳內容。");
    } catch (error) {
      setAiResult("抱歉，與 AI 老師的連線發生錯誤，請稍後再試。");
    } finally {
      setAiLoading(false);
    }
  };

  const currentCard = remainingCards[0];
  const frontWord = currentCard ? currentCard[0] || '' : '';
  const backFields = currentCard ? currentCard.map((content, idx) => {
    if (idx === 0 || !content) return null;
    return {
      title: headers[idx] || `欄位 ${idx + 1}`,
      content
    };
  }).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] font-sans flex flex-col items-center p-6 selection:bg-sky-500/30">

      {/* Selection Tooltip */}
      <div id="selectionTooltip" className="fixed bg-[#1E293B] border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm z-[9999] gap-4 shadow-2xl pointer-events-auto flex items-center backdrop-blur-md" style={tooltipStyle}>
        <div className="absolute top-full left-1/2 -ml-1.5 border-[6px] border-solid border-transparent border-t-[#1E293B]"></div>
        <a href="#" onClick={handleAIExplain} className="text-sky-400 no-underline flex items-center gap-2 transition-all hover:text-sky-300 font-medium" title="讓 AI 老師詳細解析">
          <Wand2 size={16} /> AI 解析
        </a>
        <span className="border-l border-white/10 h-4"></span>
        <a href={`https://jisho.org/search/${encodeURIComponent(selectedText)}`} target="_blank" rel="noreferrer" className="text-emerald-400 no-underline flex items-center gap-2 transition-all hover:text-emerald-300 font-medium" title="使用 Jisho 字典查詢">
          <Book size={16} /> 字典
        </a>
        <a href={`https://translate.google.com/?sl=ja&tl=zh-TW&text=${encodeURIComponent(selectedText)}&op=translate`} target="_blank" rel="noreferrer" className="text-indigo-400 no-underline flex items-center gap-2 transition-all hover:text-indigo-300 font-medium" title="使用 Google 翻譯">
          <Languages size={16} /> 翻譯
        </a>
      </div>

      {/* Header */}
      <header className="flex items-center justify-between w-full max-w-5xl mb-10 mt-2">
        <div className="flex items-center gap-3">
          <div className="bg-sky-500/10 p-2.5 rounded-xl border border-sky-500/20">
            <Languages size={28} className="text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white m-0">
            學習閃卡 <span className="text-sky-400">複習 Pro</span>
          </h1>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={() => setInfoModalOpen(true)} className="bg-white/5 border border-white/10 text-slate-300 px-4 py-2 rounded-xl cursor-pointer transition-all text-sm flex items-center gap-2 hover:bg-white/10 hover:text-white">
            <Keyboard size={16} /> 快捷鍵
          </button>
          {appState === 'practice' && (
            <button onClick={abortPractice} className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-2 rounded-xl cursor-pointer transition-all text-sm flex items-center gap-2 hover:bg-rose-500 hover:text-white">
              <Trash2 size={16} /> 中斷
            </button>
          )}
        </div>
      </header>

      {/* Upload Section */}
      {appState === 'upload' && (
        <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl space-y-10">
          <div className="text-center space-y-4">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              <span className="text-sky-400"> マイケルさんの日本語</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              匯入你的專屬單字庫，或直接點選最下方按鈕。支持 Excel 與 CSV 格式。
            </p>
          </div>

          <div className="glass-card p-10 rounded-[2rem] text-center w-full max-w-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex flex-col items-center gap-8">
              <label 
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all group relative overflow-hidden ${isDragging ? 'border-sky-500 bg-sky-500/10 scale-[0.98]' : 'border-white/10 hover:border-sky-500/50 hover:bg-sky-500/5'}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent transition-opacity ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
                <div className="flex flex-col items-center justify-center pt-5 pb-6 relative z-10">
                  <Upload className={`w-10 h-10 mb-4 text-sky-400 transition-transform ${isDragging ? 'scale-125' : 'group-hover:scale-110'}`} />
                  <p className="mb-2 text-lg font-bold text-white">點擊或拖曳檔案到這裡</p>
                  <p className="text-sm text-slate-500">支援 .csv 或 .xlsx 格式</p>
                </div>
                <input type="file" className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileUpload} />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-2">
                <div className="bg-white/5 border border-white/5 p-3 rounded-xl text-left">
                  <div className="text-sky-400 font-bold mb-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                    <CheckCircle size={12} /> 第 1 欄位
                  </div>
                  <p className="text-slate-400 text-[11px]">類別 (Category)</p>
                </div>
                <div className="bg-white/5 border border-white/5 p-3 rounded-xl text-left">
                  <div className="text-emerald-400 font-bold mb-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                    <CheckCircle size={12} /> 第 2 欄位
                  </div>
                  <p className="text-slate-400 text-[11px]">正面 (Front)</p>
                </div>
                <div className="bg-white/5 border border-white/5 p-3 rounded-xl text-left">
                  <div className="text-amber-400 font-bold mb-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                    <CheckCircle size={12} /> 第 3 欄以後
                  </div>
                  <p className="text-slate-400 text-[11px]">背面 (Back)</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 w-full pt-6">
                <div className="flex items-center gap-4 w-full">
                  <div className="h-px flex-1 bg-white/5"></div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">OR QUICK START</span>
                  <div className="h-px flex-1 bg-white/5"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <button
                    onClick={() => loadLocalFile('MNNvocab_reviewed_final.csv')}
                    className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-sky-500/30 hover:bg-sky-500/10 transition-all text-left group"
                  >
                    <div className="p-3 rounded-xl bg-sky-500/20 text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-all">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <p className="text-white font-bold">大家的日本語</p>
                      <p className="text-slate-500 text-xs">基礎 50 課單字庫</p>
                    </div>
                  </button>
                  <button
                    onClick={() => loadLocalFile('japanese_phrases.csv')}
                    className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-all text-left group"
                  >
                    <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      <MessageSquare size={24} />
                    </div>
                    <div>
                      <p className="text-white font-bold">基礎常用短句</p>
                      <p className="text-slate-500 text-xs">實用情境會話精選</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Setup Section */}
      {appState === 'setup' && (
        <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              自定義您的 <span className="text-sky-400">練習計畫</span>
            </h2>
            <p className="text-slate-400 text-lg">選擇您想複習的課程與出卡順序。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">

            {/* Course Selection */}
            <div className="md:col-span-2 glass-card p-8 rounded-[2rem] border border-white/5 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers size={20} className="text-sky-400" /> 選擇課程
                </h3>
                {allCourses.length > 0 && (
                  <button
                    onClick={() => setSelectedCourses(selectedCourses.length === allCourses.length ? [] : [...allCourses])}
                    className="text-xs font-bold text-sky-400 bg-sky-500/10 px-3 py-1.5 rounded-lg hover:bg-sky-500 hover:text-white transition-all"
                  >
                    {selectedCourses.length === allCourses.length ? '取消全選' : '全選'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {allCourses.length > 0 ? (
                  allCourses.map(course => (
                    <label key={course} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer group ${selectedCourses.includes(course) ? 'bg-sky-500/10 border-sky-500/30 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'}`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={selectedCourses.includes(course)}
                        onChange={() => {
                          if (selectedCourses.includes(course)) {
                            setSelectedCourses(selectedCourses.filter(c => c !== course));
                          } else {
                            setSelectedCourses([...selectedCourses, course]);
                          }
                        }}
                      />
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedCourses.includes(course) ? 'bg-sky-500 border-sky-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                        {selectedCourses.includes(course) && <Check size={12} className="text-slate-900 font-bold" />}
                      </div>
                      <span className="text-[10px] font-medium truncate">
                        {course.replace(/Lesson\s*|課程\s*|第|課/gi, '').trim() || course}
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="col-span-2 py-10 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <p className="text-slate-500">檔案中未偵測到課程欄位，將會練習所有單字。</p>
                  </div>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-6">
              <div className="glass-card p-8 rounded-[2rem] border border-white/5 flex-1 flex flex-col gap-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <RotateCcw size={20} className="text-sky-400" /> 出卡順序
                </h3>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setIsRandomOrder(false)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${!isRandomOrder ? 'bg-indigo-500/10 border-indigo-500/30 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'}`}
                  >
                    <span className="font-bold">依序出卡</span>
                    {!isRandomOrder && <CheckCircle size={20} className="text-indigo-400" />}
                  </button>
                  <button
                    onClick={() => setIsRandomOrder(true)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isRandomOrder ? 'bg-sky-500/10 border-sky-500/30 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'}`}
                  >
                    <span className="font-bold">隨機出卡</span>
                    {isRandomOrder && <CheckCircle size={20} className="text-sky-400" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  提示：建議使用隨機模式以強化大腦對單字的反射神經。
                </p>
              </div>

              <button
                onClick={() => startPractice()}
                disabled={courseColumnIndex !== -1 && selectedCourses.length === 0}
                className="bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 py-6 rounded-[2rem] text-xl font-black transition-all transform hover:-translate-y-1 shadow-xl shadow-sky-500/20 active:scale-95 flex items-center justify-center gap-3 group"
              >
                開始練習 <Play size={24} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <button onClick={() => setAppState('upload')} className="text-slate-500 hover:text-white transition-colors text-sm font-medium">
            ← 返回重新匯入檔案
          </button>
        </div>
      )}

      {/* Summary Section */}
      {appState === 'summary' && (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg">
          <div className="glass-card p-12 rounded-[2.5rem] text-center w-full relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/10 blur-[100px] rounded-full"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 blur-[100px] rounded-full"></div>

            <div className="relative z-10">
              <div className="text-6xl mb-6 animate-tada inline-block">🏆</div>
              <h2 className="text-white text-3xl font-bold mb-2">本次練習達成！</h2>
              <p className="text-slate-400 mb-8">你已經完成了所有卡片的複習。</p>

              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                  <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-1">總計卡片</p>
                  <p className="text-white text-2xl font-black">{initialTotalCards}</p>
                </div>
                <div className="bg-amber-500/10 p-5 rounded-2xl border border-amber-500/10">
                  <p className="text-amber-500 text-xs uppercase tracking-widest font-bold mb-1">Again</p>
                  <p className="text-amber-400 text-2xl font-black">{stats.again}</p>
                </div>
                <div className="bg-rose-500/10 p-5 rounded-2xl border border-rose-500/10">
                  <p className="text-rose-500 text-xs uppercase tracking-widest font-bold mb-1">Hard</p>
                  <p className="text-rose-400 text-2xl font-black">{stats.hard}</p>
                </div>
                <div className="bg-sky-500/10 p-5 rounded-2xl border border-sky-500/10">
                  <p className="text-sky-500 text-xs uppercase tracking-widest font-bold mb-1">Good</p>
                  <p className="text-sky-400 text-2xl font-black">{stats.good}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={() => startPractice()} className="w-full bg-white text-slate-900 py-4 rounded-2xl text-lg font-bold transition-all hover:bg-slate-200 active:scale-95 shadow-xl shadow-white/5 flex items-center justify-center gap-2">
                  <RotateCcw size={20} /> 重新開始一輪
                </button>
                <div className="flex gap-3">
                  <button onClick={() => setAppState('setup')} className="flex-1 bg-white/5 border border-white/10 text-white py-3 rounded-xl text-sm font-bold transition-all hover:bg-white/10 flex items-center justify-center gap-2">
                    <Layers size={16} /> 調整課程
                  </button>
                  <button onClick={() => setAppState('upload')} className="flex-1 bg-white/5 border border-white/10 text-white py-3 rounded-xl text-sm font-bold transition-all hover:bg-white/10 flex items-center justify-center gap-2">
                    <Upload size={16} /> 重新匯入
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flashcard Section */}
      {appState === 'practice' && remainingCards.length > 0 && (
        <div className="w-full max-w-4xl flex flex-col items-center flex-1">

          {/* Top Dashboard */}
          <div className="glass-card flex items-center justify-between w-full px-8 py-5 rounded-[1.5rem] mb-8 gap-6">
            <div className="font-mono text-2xl font-bold text-white leading-none">
              <span className="text-sky-400">{initialTotalCards - remainingCards.length + 1}</span>
              <span className="text-slate-600 text-lg mx-1">/</span>
              <span className="text-slate-400 text-lg">{initialTotalCards}</span>
            </div>
            <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500" style={{ width: `${((initialTotalCards - remainingCards.length + 1) / initialTotalCards) * 100}%` }}></div>
            </div>
            <div className="flex gap-4 text-xs font-bold tracking-widest uppercase">
              <div className="flex flex-col items-center">
                <span className="text-amber-500 mb-1">{stats.again}</span>
                <span className="text-slate-500">Again</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-rose-500 mb-1">{stats.hard}</span>
                <span className="text-slate-500">Hard</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sky-500 mb-1">{stats.good}</span>
                <span className="text-slate-500">Good</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-emerald-500 mb-1">{stats.easy}</span>
                <span className="text-slate-500">Easy</span>
              </div>
            </div>
          </div>

          {/* Flashcard Component */}
          <div className="flex items-center justify-center w-full relative gap-6 mb-10 group">
            <button onClick={goPrev} className="z-10 bg-[#1E293B]/80 hover:bg-[#1E293B] border border-white/5 rounded-2xl w-14 h-24 flex items-center justify-center text-slate-500 cursor-pointer backdrop-blur-sm transition-all hover:text-white hover:border-white/20 active:scale-95 shrink-0 shadow-lg" title="上一張">
              <ChevronLeft size={28} />
            </button>

            {/* Scene */}
            <div className="perspective-1000 w-full h-[480px] sm:h-[560px] flex-1">
              {(() => {
                const frontWord = remainingCards[0][1];
                const frontSubText = remainingCards[0][2];
                const backFields = headers.slice(3).map((h, i) => ({
                  label: h || `欄位 ${i + 4}`,
                  value: remainingCards[0][i + 3]
                })).filter(f => f.value && f.value.toString().trim());

                return (
                  <div className={`w-full h-full relative transition-transform duration-700 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`} onClick={handleCardClick}>

                    {/* Front */}
                    <div className="absolute w-full h-full backface-hidden bg-[#1E293B] rounded-[2.5rem] shadow-2xl border border-white/5 flex flex-col items-center justify-center p-10 overflow-hidden group/card [transform:translateZ(1px)]">
                      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
                      {showEasyStamp && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 text-5xl font-black text-emerald-500 border-[10px] border-emerald-500 rounded-3xl px-10 py-5 bg-[#0F172A]/90 z-20 shadow-2xl tracking-[0.2em] uppercase pointer-events-none animate-bounce">
                          学んだ
                        </div>
                      )}
                      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <h1 className="text-6xl sm:text-8xl m-0 font-bold text-white tracking-tight leading-tight">{frontWord}</h1>
                          {frontSubText && (
                            <p className="text-2xl sm:text-3xl text-sky-400/80 font-medium m-0">{frontSubText}</p>
                          )}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); speakText(frontWord); }} className="bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-slate-900 transition-all rounded-2xl p-4 shadow-lg active:scale-90" title="朗讀單字">
                          <Volume2 size={40} />
                        </button>
                        <div className="mt-4 text-slate-500 text-sm font-medium tracking-[0.3em] uppercase">點擊翻面查看</div>
                      </div>
                    </div>

                    {/* Back */}
                    <div className="absolute w-full h-full backface-hidden bg-[#1E293B] rounded-[2.5rem] shadow-2xl border border-white/5 flex flex-col items-start justify-start p-10 sm:p-14 transition-transform duration-0 rotate-y-180 overflow-hidden box-border [transform:rotateY(180deg)_translateZ(0px)]">
                      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent"></div>
                      <div className="relative z-10 w-full h-full overflow-y-auto pr-2 custom-scrollbar">
                        <ul className="space-y-8 list-none m-0">
                          {backFields.map((field, idx) => {
                            const isExample = exampleColumnIndex !== -1 && (headers[exampleColumnIndex] === field.label);
                            return (
                              <li key={idx} className="flex flex-col gap-2">
                                <span className="text-sky-400/60 text-xs font-bold uppercase tracking-[0.2em]">{field.label}</span>
                                {isExample ? (
                                  <div className="bg-emerald-500/5 border-l-4 border-emerald-500 p-6 rounded-r-2xl italic text-emerald-100/90 text-2xl leading-relaxed font-serif">
                                    {field.value}
                                  </div>
                                ) : (
                                  <div className="text-white text-3xl font-medium leading-relaxed tracking-wide">
                                    {field.value}
                                  </div>
                                )}
                                {isExample && (
                                  <button onClick={(e) => { e.stopPropagation(); speakText(field.value); }} className="self-end hover:text-emerald-400 text-slate-600 transition-all p-2 bg-white/5 rounded-xl border border-white/5 hover:border-emerald-500/50 flex items-center gap-2 text-xs" title="朗讀例句">
                                    <Volume2 size={18} /> 朗讀例句
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <button onClick={goNext} className="z-10 bg-[#1E293B]/80 hover:bg-[#1E293B] border border-white/5 rounded-2xl w-14 h-24 flex items-center justify-center text-slate-500 cursor-pointer backdrop-blur-sm transition-all hover:text-white hover:border-white/20 active:scale-95 shrink-0 shadow-lg" title="下一張">
              <ChevronRight size={28} />
            </button>
          </div>

          {/* SRS Controls - Fixed at bottom for practice state */}
          <div className={`w-full max-w-2xl px-4 transition-all duration-500 transform ${isFlipped ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
            <div className="glass-card p-4 rounded-[2rem] border border-white/10 flex gap-3 shadow-2xl">
              <button onClick={(e) => handleSrsAction(e, 'again')} className="flex-1 flex flex-col items-center gap-1 py-4 rounded-2xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all font-bold srs-shadow active:scale-95 group">
                <span className="text-lg">Again</span>
                <span className="text-[10px] opacity-60 group-hover:opacity-100 uppercase tracking-tighter">Key 1</span>
              </button>
              <button onClick={(e) => handleSrsAction(e, 'hard')} className="flex-1 flex flex-col items-center gap-1 py-4 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all font-bold srs-shadow active:scale-95 group">
                <span className="text-lg">Hard</span>
                <span className="text-[10px] opacity-60 group-hover:opacity-100 uppercase tracking-tighter">Key 2</span>
              </button>
              <button onClick={(e) => handleSrsAction(e, 'good')} className="flex-1 flex flex-col items-center gap-1 py-4 rounded-2xl bg-sky-500/10 text-sky-500 hover:bg-sky-500 hover:text-white transition-all font-bold srs-shadow active:scale-95 group">
                <span className="text-lg">Good</span>
                <span className="text-[10px] opacity-60 group-hover:opacity-100 uppercase tracking-tighter">Key 3</span>
              </button>
              <button onClick={(e) => handleSrsAction(e, 'easy')} className="flex-1 flex flex-col items-center gap-1 py-4 rounded-2xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all font-bold srs-shadow active:scale-95 group">
                <span className="text-lg">Easy</span>
                <span className="text-[10px] opacity-60 group-hover:opacity-100 uppercase tracking-tighter">Key 4</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" onClick={() => setInfoModalOpen(false)}>
          <div className="glass-card p-10 rounded-[2.5rem] max-w-lg w-full max-h-[85vh] overflow-y-auto relative shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
            <button onClick={() => setInfoModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl">
              <X size={24} />
            </button>
            <h3 className="mt-0 text-white flex items-center gap-3 text-2xl font-bold mb-8">
              <Keyboard size={28} className="text-sky-400" /> 控制指南
            </h3>
            <div className="space-y-4">
              {[
                { key: 'Space', desc: '翻轉卡片', color: 'bg-sky-500/20 text-sky-400' },
                { key: 'Enter', desc: '手動播放發音', color: 'bg-emerald-500/20 text-emerald-400' },
                { key: '1-4', desc: '標記記憶程度 (SRS)', color: 'bg-amber-500/20 text-amber-400' },
                { key: '← / →', desc: '瀏覽上/下張卡片', color: 'bg-slate-500/20 text-slate-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                  <span className="text-slate-300 font-medium">{item.desc}</span>
                  <kbd className={`${item.color} px-3 py-1.5 rounded-lg font-mono text-sm font-black border border-white/5 shadow-inner`}>{item.key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4" onClick={() => setAiModalOpen(false)}>
          <div className="glass-card p-10 rounded-[2.5rem] max-w-2xl w-full max-h-[85vh] overflow-y-auto relative shadow-2xl border border-sky-500/20" onClick={e => e.stopPropagation()}>
            <button onClick={() => setAiModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl">
              <X size={24} />
            </button>
            <header className="flex items-center gap-4 mb-8">
              <div className="bg-sky-500/20 p-3 rounded-2xl">
                <Bot size={32} className="text-sky-400" />
              </div>
              <div>
                <h3 className="m-0 text-white text-2xl font-bold">AI 老師解析</h3>
                <p className="text-slate-500 text-sm m-0">深度解析「{selectedText}」</p>
              </div>
            </header>

            <div className="bg-white/5 rounded-3xl p-8 border border-white/5">
              {aiLoading ? (
                <div className="flex flex-col items-center py-16 gap-6">
                  <RotateCcw size={48} className="text-sky-500 animate-spin" />
                  <p className="text-slate-400 animate-pulse font-medium">思考中，請稍候...</p>
                </div>
              ) : (
                <div className="markdown-body">
                  <ReactMarkdown>{aiResult}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
