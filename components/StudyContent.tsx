
import React from 'react';
import { StudyTopic } from '../types';

interface StudyContentProps {
  topics: StudyTopic[];
  recommendedBooks?: string[];
}

// Utility to generate URL-safe slugs for linking
const slugify = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Utility to parse inline markdown: **bold**, *italic*, `code`
const renderInline = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index} className="text-slate-800 italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-sm font-mono border border-indigo-100">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

const ContentRenderer: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // H3 Header (###)
    if (line.startsWith('###')) {
      elements.push(
        <h4 key={i} className="text-lg font-bold text-slate-800 mt-6 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-indigo-500 rounded-full inline-block"></span>
            {line.replace(/^#+\s*/, '')}
        </h4>
      );
      continue;
    }

    // H1/H2 Header (Fallback, treated as large section break)
    if (line.startsWith('#') || line.startsWith('##')) {
      elements.push(
        <h3 key={i} className="text-xl font-bold text-indigo-900 mt-8 mb-4 border-b border-indigo-100 pb-2">
            {line.replace(/^#+\s*/, '')}
        </h3>
      );
      continue;
    }

    // Blockquote (> text)
    if (line.startsWith('>')) {
      elements.push(
        <div key={i} className="border-l-4 border-amber-400 bg-amber-50 p-4 my-4 rounded-r-lg text-slate-700 italic shadow-sm">
          <span className="font-bold text-amber-600 block text-xs uppercase tracking-wider mb-1 not-italic">Key Note</span>
          {renderInline(line.replace(/^>\s*/, ''))}
        </div>
      );
      continue;
    }

    // List Item (- or *)
    if (line.match(/^[-*]\s/)) {
      elements.push(
        <div key={i} className="flex items-start gap-3 mb-2 ml-1">
           <span className="mt-2 w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0" />
           <span className="text-slate-700 leading-relaxed">{renderInline(line.replace(/^[-*]\s/, ''))}</span>
        </div>
      );
      continue;
    }
    
    // Ordered List (1. )
    const orderedMatch = line.match(/^(\d+)\.\s(.*)/);
    if (orderedMatch) {
        elements.push(
            <div key={i} className="flex items-start gap-3 mb-2 ml-1">
                <span className="font-bold text-indigo-600 text-sm mt-0.5">{orderedMatch[1]}.</span>
                <span className="text-slate-700 leading-relaxed">{renderInline(orderedMatch[2])}</span>
            </div>
        );
        continue;
    }

    // Standard Paragraph
    elements.push(
      <p key={i} className="text-slate-600 leading-relaxed mb-4 text-justify">
        {renderInline(line)}
      </p>
    );
  }

  return <div className="text-base">{elements}</div>;
};

const StudyContent: React.FC<StudyContentProps> = ({ topics, recommendedBooks }) => {
  return (
    <div className="space-y-12 max-w-4xl mx-auto pb-12">
      {/* Topics List */}
      {topics.map((topic, index) => (
        <div 
          key={index} 
          id={`topic-${slugify(topic.title)}`}
          className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md scroll-mt-24"
        >
          {/* Header Card */}
          <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold shadow-sm shadow-indigo-200">
                {index + 1}
              </span>
              {topic.title}
            </h3>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {topic.estimatedTime}
            </span>
          </div>
          
          <div className="p-6 md:p-8">
            {/* Main Content */}
            <div className="mb-8">
                <ContentRenderer content={topic.content} />
            </div>

            {/* Key Concepts Footer */}
            <div className="bg-gradient-to-r from-indigo-50 to-slate-50 rounded-xl p-5 border border-indigo-100/50">
              <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                </svg>
                Key Concepts Review
              </h4>
              <div className="flex flex-wrap gap-2">
                {topic.keyConcepts.map((concept, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-white text-indigo-700 text-sm font-medium rounded-lg border border-indigo-100 shadow-sm transition-transform hover:scale-105 cursor-default">
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Recommended Books Section */}
      {recommendedBooks && recommendedBooks.length > 0 && (
        <div className="bg-emerald-50 rounded-xl shadow-sm border border-emerald-100 p-8 mt-10">
          <h3 className="text-xl font-bold text-emerald-900 mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Recommended Books & Resources
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {recommendedBooks.map((book, idx) => (
              <div key={idx} className="flex items-start gap-4 bg-white p-4 rounded-xl border border-emerald-100/50 hover:border-emerald-200 transition-colors shadow-sm">
                <div className="mt-1 bg-emerald-100 text-emerald-600 rounded-full p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <span className="text-slate-700 text-sm font-medium leading-relaxed">{book}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyContent;
