import React, { useState, useEffect } from "react";
import {
  ArrowLeftRight,
  Volume2,
  Copy,
  RotateCcw,
  Globe,
  Settings,
} from "lucide-react";

// Types
interface Language {
  code: string;
  name: string;
  flag: string;
}

interface Translation {
  source: string;
  target: string;
  from: string;
  to: string;
  timestamp: number;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// Gemini API translation function
const translateWithGemini = async (
  text: string,
  fromLang: string,
  toLang: string,
  apiKey: string
): Promise<string> => {
  if (!apiKey) {
    throw new Error("Gemini API key is required");
  }

  const fromLangName =
    languages.find((lang) => lang.code === fromLang)?.name || fromLang;
  const toLangName =
    languages.find((lang) => lang.code === toLang)?.name || toLang;

  const prompt =
    fromLang === "auto"
      ? `Translate the following text to ${toLangName}. Only return the translation, nothing else:\n\n${text}`
      : `Translate the following text from ${fromLangName} to ${toLangName}. Only return the translation, nothing else:\n\n${text}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${
      apiKey || import.meta.env.VITE_GEMINI_KEY
    }`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Gemini API error: ${response.status} - ${
        errorData.error?.message || "Unknown error"
      }`
    );
  }

  const data: GeminiResponse = await response.json();

  if (
    !data.candidates ||
    !data.candidates[0] ||
    !data.candidates[0].content ||
    !data.candidates[0].content.parts[0]
  ) {
    throw new Error("Invalid response from Gemini API");
  }

  return data.candidates[0].content.parts[0].text.trim();
};

const languages: Language[] = [
  { code: "auto", name: "Detect Language", flag: "🌐" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "zh", name: "Chinese (Simplified)", flag: "🇨🇳" },
  { code: "zh-TW", name: "Chinese (Traditional)", flag: "🇹🇼" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "th", name: "Thai", flag: "🇹🇭" },
  { code: "vi", name: "Vietnamese", flag: "🇻🇳" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "sv", name: "Swedish", flag: "🇸🇪" },
  { code: "da", name: "Danish", flag: "🇩🇰" },
  { code: "no", name: "Norwegian", flag: "🇳🇴" },
];

// URL parameter utilities
const getUrlParams = (): { sl?: string; tl?: string } => {
  const params = new URLSearchParams(window.location.search);
  return {
    sl: params.get("sl") || "en",
    tl: params.get("tl") || "ja",
  };
};

const updateUrlParams = (sourceLang: string, targetLang: string): void => {
  const url = new URL(window.location.href);
  if (sourceLang && sourceLang !== "auto") {
    url.searchParams.set("sl", sourceLang);
  } else {
    url.searchParams.delete("sl");
  }
  if (targetLang) {
    url.searchParams.set("tl", targetLang);
  }
  window.history.replaceState({}, "", url.toString());
};

export default function Translate(): JSX.Element {
  const url = new URL(window.location.href);
  const [sourceText, setSourceText] = useState<string>("");
  const [translatedText, setTranslatedText] = useState<string>("");
  const [sourceLang, setSourceLang] = useState<string>(
    url.searchParams.get("sl") || "en"
  );
  const [targetLang, setTargetLang] = useState<string>(
    url.searchParams.get("tl") || "ja"
  );
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [recentTranslations, setRecentTranslations] = useState<Translation[]>(
    []
  );
  const [apiKey, setApiKey] = useState<string>(
    import.meta.env.VITE_GEMINI_KEY || ""
  );
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Initialize from URL parameters and localStorage
  useEffect(() => {
    const urlParams = getUrlParams();
    const savedApiKey = localStorage.getItem("gemini-api-key") || "";
    const savedTranslations = localStorage.getItem("translation-history");

    if (urlParams.sl && languages.some((lang) => lang.code === urlParams.sl)) {
      setSourceLang(urlParams.sl);
    }
    if (urlParams.tl && languages.some((lang) => lang.code === urlParams.tl)) {
      setTargetLang(urlParams.tl);
    }

    setApiKey(savedApiKey);
    setShowApiKeyInput(!savedApiKey);

    if (savedTranslations) {
      try {
        const parsedTranslations: Translation[] = JSON.parse(savedTranslations);
        setRecentTranslations(parsedTranslations);
      } catch (e) {
        console.error("Failed to parse saved translations:", e);
      }
    }
  }, []);

  // Update URL when languages change
  useEffect(() => {
    updateUrlParams(sourceLang, targetLang);
  }, [sourceLang, targetLang]);

  // Save API key to localStorage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("gemini-api-key", apiKey);
    }
  }, [apiKey]);

  // Save translations to localStorage
  useEffect(() => {
    localStorage.setItem(
      "translation-history",
      JSON.stringify(recentTranslations)
    );
  }, [recentTranslations]);

  const handleTranslate = React.useCallback(async (): Promise<void> => {
    if (!sourceText.trim()) return;

    if (!apiKey) {
      setError("Please enter your Gemini API key first");
      setShowApiKeyInput(true);
      return;
    }

    setIsTranslating(true);
    setError("");

    try {
      const result = await translateWithGemini(
        sourceText,
        sourceLang,
        targetLang,
        apiKey
      );
      setTranslatedText(result);

      // Add to recent translations if not duplicate
      const newTranslation: Translation = {
        source: sourceText.trim(),
        target: result,
        from: sourceLang === "auto" ? "en" : sourceLang,
        to: targetLang,
        timestamp: Date.now(),
      };

      setRecentTranslations((prev) => {
        // Check if this exact translation already exists
        const isDuplicate = prev.some(
          (translation) =>
            translation.source.toLowerCase() ===
              newTranslation.source.toLowerCase() &&
            translation.target.toLowerCase() ===
              newTranslation.target.toLowerCase() &&
            translation.from === newTranslation.from &&
            translation.to === newTranslation.to
        );
        const set = new Set();
        let temp;
        if (isDuplicate) {
          // Update timestamp of existing translation and move to top
          temp = [
            newTranslation,
            ...prev.filter(
              (translation) =>
                !(
                  translation.source.toLowerCase() ===
                    newTranslation.source.toLowerCase() &&
                  translation.target.toLowerCase() ===
                    newTranslation.target.toLowerCase() &&
                  translation.from === newTranslation.from &&
                  translation.to === newTranslation.to
                )
            ),
          ].slice(0, 10);
        } else {
          // Add new translation
          temp = [newTranslation, ...prev.slice(0, 9)];
        }
        return temp
          .filter((_, index) => index < 10)
          .filter((translation) => {
            const key = `${translation.source}-${translation.target}-${translation.from}-${translation.to}`;
            if (set.has(key)) {
              return false;
            } else {
              set.add(key);
              return true;
            }
          });
      });
    } catch (error) {
      console.error("Translation error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Translation failed. Please try again."
      );
      setTranslatedText("");
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, sourceLang, targetLang, apiKey]);

  // Auto-translate as user types (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceText.trim() && apiKey) {
        handleTranslate();
      } else {
        setTranslatedText("");
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [sourceText, sourceLang, targetLang, apiKey, handleTranslate]);

  const swapLanguages = (): void => {
    if (sourceLang !== "auto" && translatedText) {
      const temp = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(temp);
      setSourceText(translatedText);
      setTranslatedText(sourceText);
    }
  };

  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  const speakText = (text: string, lang: string): void => {
    if ("speechSynthesis" in window && text.trim()) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "auto" ? "en" : lang;
      speechSynthesis.speak(utterance);
    }
  };

  const clearText = (): void => {
    setSourceText("");
    setTranslatedText("");
    setError("");
  };

  const clearHistory = (): void => {
    setRecentTranslations([]);
  };

  const getLanguageName = (code: string): string => {
    return languages.find((lang) => lang.code === code)?.name || code;
  };

  const getLanguageFlag = (code: string): string => {
    return languages.find((lang) => lang.code === code)?.flag || "🌐";
  };

  const handleSourceLangChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ): void => {
    setSourceLang(e.target.value);
  };

  const handleTargetLangChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ): void => {
    setTargetLang(e.target.value);
  };

  const handleSourceTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ): void => {
    const text = e.target.value;
    if (text.length <= 5000) {
      setSourceText(text);
      if (error) setError("");
    }
  };

  const handleRecentTranslation = (translation: Translation): void => {
    setSourceText(translation.source);
    setSourceLang(translation.from);
    setTargetLang(translation.to);
  };

  const saveApiKey = (): void => {
    if (apiKey.trim()) {
      setShowApiKeyInput(false);
      setError("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-normal text-gray-800">Translate</h1>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Powered by プレエイペックス
              </span>
            </div>
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="API Settings"
              type="button"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* API Key Input */}
        {showApiKeyInput && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Gemini API Configuration
            </h3>
            <div className="flex items-center space-x-4">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={saveApiKey}
                disabled={!apiKey.trim()}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                Save
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Get your free API key at{" "}
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Main Translation Interface */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          {/* Language Selection Bar */}
          <div className="bg-gray-50 px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <select
                  value={sourceLang}
                  onChange={handleSourceLangChange}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={swapLanguages}
                  disabled={sourceLang === "auto" || !translatedText}
                  className="p-2 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Swap languages"
                  type="button"
                >
                  <ArrowLeftRight className="w-5 h-5 text-gray-600" />
                </button>

                <select
                  value={targetLang}
                  onChange={handleTargetLangChange}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {languages
                    .filter((lang) => lang.code !== "auto")
                    .map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                </select>
              </div>

              <button
                onClick={clearText}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-200 transition-colors"
                title="Clear all"
                type="button"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Translation Areas */}
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Source Text Area */}
            <div className="relative">
              <div className="p-6 border-r">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    {getLanguageFlag(sourceLang)} {getLanguageName(sourceLang)}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => speakText(sourceText, sourceLang)}
                      disabled={!sourceText}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                      title="Listen"
                      type="button"
                    >
                      <Volume2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(sourceText)}
                      disabled={!sourceText}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                      title="Copy"
                      type="button"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                <textarea
                  value={sourceText}
                  onChange={handleSourceTextChange}
                  placeholder="Enter text to translate..."
                  className="w-full h-40 resize-none border-none outline-none text-lg text-gray-800 placeholder-gray-400"
                  maxLength={5000}
                />
                <div className="text-xs text-gray-400 mt-2">
                  {sourceText.length}/5000
                </div>
              </div>
            </div>

            {/* Target Text Area */}
            <div className="relative">
              <div className="p-6 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    {getLanguageFlag(targetLang)} {getLanguageName(targetLang)}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => speakText(translatedText, targetLang)}
                      disabled={!translatedText}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                      title="Listen"
                      type="button"
                    >
                      <Volume2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(translatedText)}
                      disabled={!translatedText}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                      title="Copy"
                      type="button"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                <div className="w-full h-40 flex items-start">
                  {isTranslating ? (
                    <div className="flex items-center space-x-2 text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span>Translating...</span>
                    </div>
                  ) : (
                    <div className="text-lg text-gray-800 whitespace-pre-wrap">
                      {translatedText ||
                        (sourceText && !apiKey
                          ? "Please configure your Gemini API key first"
                          : sourceText
                          ? "Translation will appear here..."
                          : "")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Translations */}
        {recentTranslations.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Recent Translations
              </h2>
              <button
                onClick={clearHistory}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
                type="button"
              >
                Clear History
              </button>
            </div>
            <div className="space-y-3">
              {recentTranslations.map((translation, index) => (
                <div
                  key={`${translation.timestamp}-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-700">
                        {translation.source}
                      </span>
                      <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">
                        {translation.target}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {getLanguageName(translation.from)} →{" "}
                      {getLanguageName(translation.to)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyToClipboard(translation.target)}
                      className="p-1 rounded hover:bg-gray-200"
                      title="Copy translation"
                      type="button"
                    >
                      <Copy className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleRecentTranslation(translation)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      type="button"
                    >
                      Use
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
