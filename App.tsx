
import React, { useState } from 'react';
import { AppState, StudyResponse, SyllabusInput, SubjectStructure } from './types';
import { generateStudyMaterial, analyzeSyllabusStructure } from './services/geminiService';
import MindMapGraph from './components/MindMapGraph';
import StudyContent from './components/StudyContent';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('idle');
  const [programName, setProgramName] = useState('');
  
  // Updated state to handle complex inputs
  const [syllabusInput, setSyllabusInput] = useState<SyllabusInput | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // New State for Subjects with Topics
  const [detectedSubjects, setDetectedSubjects] = useState<SubjectStructure[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  
  // Topic Configuration State
  const [configuringSubject, setConfiguringSubject] = useState<SubjectStructure | null>(null);
  const [focusTopic, setFocusTopic] = useState<string>('');
  
  const [result, setResult] = useState<StudyResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'mindmap'>('content');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';

      if (isImage || isPdf) {
        // Handle Binary Files (Images, PDF)
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          // Remove Data URL prefix to get raw base64
          const base64Data = result.split(',')[1]; 
          setSyllabusInput({
            fileData: {
              mimeType: file.type,
              data: base64Data
            }
          });
        };
        reader.readAsDataURL(file);
      } else {
        // Handle Text Files
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setSyllabusInput({ text });
        };
        reader.readAsText(file);
      }
    }
  };

  const handleBack = () => {
    switch (appState) {
      case 'selecting-subject':
        setAppState('idle');
        setDetectedSubjects([]);
        setSyllabusInput(null);
        setFileName(null);
        break;
      case 'generating-content':
        // Abort not truly possible with just fetch, but we can reset state
        setAppState('selecting-subject');
        break;
      case 'success':
        setAppState('selecting-subject');
        setResult(null);
        setFocusTopic('');
        setSelectedSubject('');
        break;
      case 'error':
         // Try to go back to a safe state depending on what data we have
         if (detectedSubjects.length > 0) {
             setAppState('selecting-subject');
         } else {
             setAppState('idle');
         }
         setErrorMsg(null);
         break;
      default:
        break;
    }
  };

  const handleReset = () => {
    setAppState('idle');
    setResult(null);
    setProgramName('');
    setFileName(null);
    setSyllabusInput(null);
    setDetectedSubjects([]);
    setSelectedSubject('');
    setConfiguringSubject(null);
    setFocusTopic('');
  };

  // Step 1: Analyze Syllabus to find subjects
  const handleAnalyzeSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programName || !syllabusInput) {
      setErrorMsg("Please provide both a program name and a syllabus file.");
      return;
    }

    setAppState('analyzing-syllabus');
    setErrorMsg(null);

    try {
      const structure = await analyzeSyllabusStructure(syllabusInput);
      setDetectedSubjects(structure.subjects);
      setAppState('selecting-subject');
    } catch (err) {
      setAppState('error');
      setErrorMsg("Failed to analyze syllabus structure. Please ensure the file is readable.");
    }
  };

  // Open Configuration Modal
  const handleSubjectClick = (subject: SubjectStructure) => {
    setConfiguringSubject(subject);
    setFocusTopic('');
  };

  // Step 2: Generate Content for specific subject (and optional topic)
  const handleGenerateContent = async () => {
    if (!syllabusInput || !configuringSubject) return;
    
    const subjectToStudy = configuringSubject.name;
    const topicToStudy = focusTopic;
    
    // Close modal
    setConfiguringSubject(null);
    
    setSelectedSubject(subjectToStudy);
    setAppState('generating-content');
    
    try {
      const data = await generateStudyMaterial(programName, syllabusInput, subjectToStudy, topicToStudy);
      setResult(data);
      setAppState('success');
      setActiveTab('content'); // Default to content
    } catch (err) {
      setAppState('error');
      setErrorMsg("Failed to generate study material. Please try again.");
    }
  };

  // Helper to Slugify Title for ID matching
  const slugify = (text: string) => {
    return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
  };

  // Handle Mind Map Node Click
  const handleNodeClick = (nodeName: string) => {
      // Switch tab
      setActiveTab('content');
      
      // Try to find matching topic
      if (!result) return;
      
      // Fuzzy matching: check if node name is contained in topic title or vice versa
      const targetTopic = result.topics.find(t => 
        t.title.toLowerCase().includes(nodeName.toLowerCase()) || 
        nodeName.toLowerCase().includes(t.title.toLowerCase())
      );

      if (targetTopic) {
          // Allow render cycle to switch tab then scroll
          setTimeout(() => {
              const el = document.getElementById(`topic-${slugify(targetTopic.title)}`);
              if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  // Add a highlight flash effect
                  el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
                  setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2'), 2000);
              }
          }, 100);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             {/* Back Button */}
             {appState !== 'idle' && appState !== 'analyzing-syllabus' && (
                 <button 
                    onClick={handleBack}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                    title="Go Back"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                 </button>
             )}
             
             <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h1 className="text-xl font-bold tracking-tight text-slate-800">Synapse</h1>
             </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Breadcrumbs / Status */}
            <div className="hidden md:flex items-center text-sm text-slate-500">
                <span className={appState === 'idle' ? 'text-indigo-600 font-semibold' : ''}>Upload</span>
                <span className="mx-2">/</span>
                <span className={appState === 'selecting-subject' || appState === 'generating-content' ? 'text-indigo-600 font-semibold' : ''}>Select Subject</span>
                <span className="mx-2">/</span>
                <span className={appState === 'success' ? 'text-indigo-600 font-semibold' : ''}>Study</span>
            </div>
            
            {appState !== 'idle' && (
                <button 
                onClick={handleReset}
                className="text-sm font-medium text-slate-600 hover:text-red-600 transition-colors ml-4"
                >
                Start Over
                </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* IDLE STATE: Input Form */}
        {appState === 'idle' && (
          <div className="max-w-xl mx-auto mt-12">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Turn Chaos into Concepts</h2>
              <p className="text-lg text-slate-600">Upload your syllabus. We'll extract the subjects and topics so you can build a perfect study guide.</p>
            </div>

            <form onSubmit={handleAnalyzeSyllabus} className="bg-white shadow-xl shadow-slate-200/50 rounded-2xl p-8 border border-slate-100">
              <div className="space-y-6">
                
                {/* Program Input */}
                <div>
                  <label htmlFor="program" className="block text-sm font-semibold text-slate-700 mb-2">
                    What are you preparing for?
                  </label>
                  <input
                    type="text"
                    id="program"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="e.g., Computer Science Sem 4, MCAT, Law School"
                    className="block w-full rounded-lg border-slate-300 bg-slate-50 border p-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Upload Syllabus
                  </label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept=".txt,.md,.csv,.json,.pdf,image/*"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${fileName ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}>
                      {fileName ? (
                        <div className="flex items-center justify-center gap-2 text-indigo-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H8z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium truncate max-w-[200px]">{fileName}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm text-slate-500">Click to upload or drag and drop</p>
                          <p className="text-xs text-slate-400">PDF, Images (JPG, PNG), or Text</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5"
                >
                  Find Subjects
                </button>
              </div>
            </form>
          </div>
        )}

        {/* LOADING STATE 1: Analyzing Syllabus */}
        {appState === 'analyzing-syllabus' && (
          <div className="flex flex-col items-center justify-center mt-20 space-y-6">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-800">Analyzing Syllabus...</h3>
              <p className="text-slate-500 mt-2">Identifying subjects and extracting topics.</p>
            </div>
          </div>
        )}

        {/* SELECT SUBJECT STATE */}
        {appState === 'selecting-subject' && (
          <div className="max-w-5xl mx-auto mt-8 animate-fade-in-up">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-slate-900">What would you like to study?</h2>
              <p className="text-slate-600 mt-2">Select a subject to customize your study plan.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {detectedSubjects.map((subject, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSubjectClick(subject)}
                  className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all text-left group overflow-hidden"
                >
                   <div className="p-6 flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors text-xl mb-3">
                        {subject.name}
                      </h3>
                      {subject.topics.length > 0 && (
                        <div className="text-sm text-slate-500">
                          <span className="font-semibold text-slate-600">Includes: </span>
                          {subject.topics.slice(0, 3).join(', ')}
                          {subject.topics.length > 3 && '...'}
                        </div>
                      )}
                   </div>
                   <div className="bg-slate-50 p-3 text-xs text-center text-slate-500 border-t border-slate-100 group-hover:bg-indigo-50/50 transition-colors">
                      Tap to configure
                   </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CONFIGURATION MODAL */}
        {configuringSubject && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
                    <div className="p-6 bg-white shrink-0">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800">Study {configuringSubject.name}</h3>
                                <p className="text-slate-500 text-sm mt-1">
                                    Select a topic from the syllabus or type your own.
                                </p>
                            </div>
                            <button 
                                onClick={() => setConfiguringSubject(null)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-y-auto px-6 pb-2">
                        {/* Suggested Topics from Syllabus */}
                        {configuringSubject.topics && configuringSubject.topics.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Topics found in syllabus</h4>
                                <div className="flex flex-wrap gap-2">
                                    {configuringSubject.topics.map((topic, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setFocusTopic(topic)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all text-left ${
                                                focusTopic === topic 
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105' 
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            {topic}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Custom Input */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 mb-4">
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Selected Topic / Custom Focus
                            </label>
                            <input 
                                autoFocus
                                type="text" 
                                value={focusTopic}
                                onChange={e => setFocusTopic(e.target.value)}
                                placeholder="Type a specific topic or select one from above..."
                                className="w-full rounded-lg border-slate-300 bg-white border p-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm placeholder:text-slate-400"
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                Leave blank to generate a broad guide for the entire subject "{configuringSubject.name}".
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-200 shrink-0">
                        <button 
                            onClick={() => setConfiguringSubject(null)}
                            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleGenerateContent}
                            className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2"
                        >
                            {focusTopic ? `Generate Guide for "${focusTopic.length > 20 ? focusTopic.slice(0,18)+'...' : focusTopic}"` : 'Generate Full Subject Guide'}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* LOADING STATE 2: Generating Content */}
        {appState === 'generating-content' && (
          <div className="flex flex-col items-center justify-center mt-20 space-y-6">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
              <svg className="absolute inset-0 m-auto h-10 w-10 text-indigo-600 animate-pulse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-800">
                {focusTopic ? `Mastering "${focusTopic}"` : `Compiling ${selectedSubject}`}
              </h3>
              <p className="text-slate-500 mt-2">Checking recommended books, detailed concepts, and drawing the mind map.</p>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {appState === 'error' && (
           <div className="max-w-md mx-auto mt-20 text-center">
             <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h3>
             <p className="text-slate-600 mb-6">{errorMsg || "We encountered an error processing your request."}</p>
             <button 
               onClick={handleBack}
               className="bg-white border border-slate-300 text-slate-700 font-medium py-2 px-6 rounded-lg hover:bg-slate-50"
             >
               Go Back
             </button>
           </div>
        )}

        {/* SUCCESS STATE: Results */}
        {appState === 'success' && result && (
          <div className="animate-fade-in-up">
            <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block">
                  {focusTopic ? 'Focused Study Plan' : 'Subject Overview'}
                </span>
                <h2 className="text-3xl font-bold text-slate-900">{result.courseTitle}</h2>
                <p className="text-lg text-slate-600 mt-2 max-w-4xl">{result.overview}</p>
              </div>
              <button 
                onClick={handleBack}
                className="whitespace-nowrap text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors"
              >
                ← Change Subject/Topic
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 mb-8 sticky top-16 bg-slate-50 z-30 pt-2">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('content')}
                  className={`${
                    activeTab === 'content'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                  Detailed Study Guide
                </button>
                <button
                  onClick={() => setActiveTab('mindmap')}
                  className={`${
                    activeTab === 'mindmap'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                  Mind Map
                </button>
              </nav>
            </div>

            {/* Content Area */}
            <div className="min-h-[500px]">
              <div className={activeTab === 'content' ? 'block' : 'hidden'}>
                <StudyContent topics={result.topics} recommendedBooks={result.recommendedBooks} />
              </div>
              <div className={activeTab === 'mindmap' ? 'block' : 'hidden'}>
                 <MindMapGraph data={result.mindMap} onNodeClick={handleNodeClick} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
