// app/personality-test/page.tsx
'use client';

import { trackTestStarted, trackTestCompleted } from '@/lib/analytics';
import { useEffect, useState } from 'react';

export default function PersonalityTestPage() {
  const [testCompleted, setTestCompleted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(1);

  useEffect(() => {
    trackTestStarted();
  }, []);

  const handleTestComplete = () => {
    const mockResults = {
      bigFive: {
        openness: 75,
        conscientiousness: 80,
        extraversion: 60,
        agreeableness: 85,
        neuroticism: 40,
      }
    };
    trackTestCompleted(mockResults.bigFive);
    setTestCompleted(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Personality Test</h1>
        <p className="text-slate-400 mb-8">Big Five psychometric assessment</p>
        
        {testCompleted ? (
          <div className="bg-green-900/20 border border-green-500 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-green-400 mb-2">Test Completed!</h2>
            <p className="text-slate-300">Your personality profile has been saved.</p>
          </div>
        ) : (
          <div className="bg-slate-900 rounded-lg p-6">
            <p className="text-slate-300 mb-4">Question {currentQuestion} of 50</p>
            <p className="text-white mb-6">I see myself as someone who is outgoing and sociable.</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => {
                    if (currentQuestion < 50) {
                      setCurrentQuestion(currentQuestion + 1);
                    } else {
                      handleTestComplete();
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
