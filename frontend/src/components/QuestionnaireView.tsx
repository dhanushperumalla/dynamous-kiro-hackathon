import React, { useState, useEffect } from 'react';
import { assessmentService, Assessment, Questionnaire, QuestionResponse } from '@/services/assessmentService';
import toast from 'react-hot-toast';

interface QuestionnaireViewProps {
  assessment: Assessment | null;
  onComplete: (assessment: Assessment) => void;
  onBack: () => void;
}

export const QuestionnaireView: React.FC<QuestionnaireViewProps> = ({
  assessment,
  onComplete,
  onBack
}) => {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, QuestionResponse>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());

  useEffect(() => {
    loadQuestionnaire();
  }, []);

  useEffect(() => {
    // Reset start time when question changes
    setStartTime(Date.now());
  }, [currentQuestionIndex]);

  const loadQuestionnaire = async () => {
    try {
      const questionnaireData = await assessmentService.getQuestionnaire();
      setQuestionnaire(questionnaireData);
      
      // If assessment exists, load existing responses
      if (assessment?.progress?.answeredQuestions && assessment.progress.answeredQuestions > 0) {
        // In a real implementation, you'd load the existing responses
        // For now, we'll start fresh
      }
    } catch (err) {
      console.error('Error loading questionnaire:', err);
      toast.error('Failed to load questionnaire');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer: any, confidence?: number) => {
    if (!questionnaire) return;

    const currentQuestion = questionnaire.questions[currentQuestionIndex];
    const responseTime = Date.now() - startTime;

    const response: QuestionResponse = {
      questionId: currentQuestion.id,
      answer,
      responseTime,
      confidence
    };

    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: response
    }));
  };

  const handleNext = () => {
    if (!questionnaire) return;
    
    const currentQuestion = questionnaire.questions[currentQuestionIndex];
    const hasAnswer = responses[currentQuestion.id];
    
    if (currentQuestion.required && !hasAnswer) {
      toast.error('Please answer this question before continuing');
      return;
    }

    // Clear any existing error toasts
    toast.dismiss();

    if (currentQuestionIndex < questionnaire.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!questionnaire) return;

    try {
      setSubmitting(true);
      
      const responseArray = Object.values(responses);
      const result = await assessmentService.submitResponses({
        responses: responseArray,
        isPartial: false
      });

      toast.success('Assessment completed successfully!');
      onComplete(result.assessment);
    } catch (err: any) {
      console.error('Error submitting assessment:', err);
      toast.error('Failed to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProgress = async () => {
    if (!questionnaire || Object.keys(responses).length === 0) return;

    try {
      const responseArray = Object.values(responses);
      await assessmentService.submitResponses({
        responses: responseArray,
        isPartial: true
      });
      toast.success('Progress saved!');
    } catch (err) {
      console.error('Error saving progress:', err);
      toast.error('Failed to save progress');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!questionnaire) {
    return (
      <div className="text-center">
        <p className="text-red-600">Failed to load questionnaire</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:text-blue-500">
          Go Back
        </button>
      </div>
    );
  }

  const currentQuestion = questionnaire.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questionnaire.questions.length) * 100;
  const currentAnswer = responses[currentQuestion.id]?.answer;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <button
            onClick={handleSaveProgress}
            className="text-blue-600 hover:text-blue-500 text-sm font-medium"
          >
            Save Progress
          </button>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{questionnaire.title}</h1>
        <p className="text-gray-600 mb-4">{questionnaire.description}</p>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {currentQuestionIndex + 1} of {questionnaire.questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {currentQuestion.category}
            </span>
            {currentQuestion.required && (
              <span className="ml-2 text-red-500 text-sm">*Required</span>
            )}
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {currentQuestion.text}
          </h2>
        </div>

        {/* Answer Options */}
        <div className="mb-8">
          {currentQuestion.type === 'rating_scale' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Not at all</span>
                <span className="text-sm text-gray-600">Extremely</span>
              </div>
              <div className="flex justify-between items-center">
                {Array.from({ length: 5 }, (_, i) => i + 1).map((value) => (
                  <label key={value} className="flex flex-col items-center cursor-pointer">
                    <input
                      type="radio"
                      name={currentQuestion.id}
                      value={value}
                      checked={currentAnswer === value}
                      onChange={(e) => handleAnswer(parseInt(e.target.value))}
                      className="mb-2"
                    />
                    <span className="text-sm font-medium">{value}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {currentQuestion.type === 'multiple_choice' && (
            <div className="space-y-3">
              {currentQuestion.options?.map((option, index) => (
                <label key={index} className="flex items-center cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value={option}
                    checked={currentAnswer === option}
                    onChange={(e) => handleAnswer(e.target.value)}
                    className="mr-3"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}

          {currentQuestion.type === 'boolean' && (
            <div className="space-y-3">
              <label className="flex items-center cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  type="radio"
                  name={currentQuestion.id}
                  value="true"
                  checked={currentAnswer === true}
                  onChange={() => handleAnswer(true)}
                  className="mr-3"
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  type="radio"
                  name={currentQuestion.id}
                  value="false"
                  checked={currentAnswer === false}
                  onChange={() => handleAnswer(false)}
                  className="mr-3"
                />
                <span>No</span>
              </label>
            </div>
          )}

          {(currentQuestion.type === 'text' || currentQuestion.type === 'text_input') && (
            <textarea
              value={currentAnswer || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <button
            onClick={handleNext}
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {submitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </span>
            ) : currentQuestionIndex === questionnaire.questions.length - 1 ? (
              'Complete Assessment'
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};