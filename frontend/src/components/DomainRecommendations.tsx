import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchLatestRecommendation, addRecommendationFeedback, fetchDomainDetails } from '@/store/slices/recommendationSlice';
import { RecommendedDomain, DomainSelection } from '@/types/recommendations';
import toast from 'react-hot-toast';

interface DomainRecommendationsProps {
  onDomainSelected: (domain: RecommendedDomain) => void;
  onBack: () => void;
}

export const DomainRecommendations: React.FC<DomainRecommendationsProps> = ({
  onDomainSelected,
  onBack
}) => {
  const dispatch = useAppDispatch();
  const { currentRecommendation, isLoading, error } = useAppSelector(state => state.recommendations);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState<{ domainId: string; domain: RecommendedDomain } | null>(null);

  useEffect(() => {
    // Fetch the latest recommendation when component mounts
    dispatch(fetchLatestRecommendation());
  }, [dispatch]);

  const handleDomainSelect = async (domain: RecommendedDomain) => {
    try {
      setSelectedDomainId(domain.domainId);
      
      // Add positive feedback for selected domain
      if (currentRecommendation) {
        await dispatch(addRecommendationFeedback({
          recommendationId: currentRecommendation.id,
          feedback: {
            domainId: domain.domainId,
            rating: 5,
            feedback: 'helpful',
            comments: `Selected ${domain.domain.title} based on ${domain.matchScore}% match`,
            selectedDomain: domain.domainId
          }
        }));
      }

      toast.success(`${domain.domain.title} selected! Proceeding to learning path.`);
      onDomainSelected(domain);
    } catch (err) {
      toast.error('An error occurred while selecting the domain.');
    } finally {
      setSelectedDomainId(null);
    }
  };

  const handleViewDetails = (domainId: string) => {
    dispatch(fetchDomainDetails(domainId));
  };

  const handleProvideFeedback = (domain: RecommendedDomain) => {
    setShowFeedbackModal({ domainId: domain.domainId, domain });
  };

  const submitFeedback = async (feedback: DomainSelection) => {
    if (!showFeedbackModal || !currentRecommendation) return;

    try {
      await dispatch(addRecommendationFeedback({
        recommendationId: currentRecommendation.id,
        feedback
      }));
      toast.success('Thank you for your feedback!');
      setShowFeedbackModal(null);
    } catch (err) {
      toast.error('Failed to submit feedback. Please try again.');
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-blue-600 bg-blue-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getMatchScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent Match';
    if (score >= 80) return 'Great Match';
    if (score >= 70) return 'Good Match';
    return 'Fair Match';
  };

  const formatSalary = (min: number, max: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-orange-100 text-orange-800';
      case 'expert': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing your interests and generating recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <svg className="h-6 w-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-800">Error Loading Recommendations</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <div className="flex space-x-3">
          <button
            onClick={() => dispatch(fetchLatestRecommendation())}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Try Again
          </button>
          <button
            onClick={onBack}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!currentRecommendation || !currentRecommendation.domains.length) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recommendations Available</h3>
        <p className="text-gray-600 mb-4">We couldn't generate domain recommendations based on your assessment.</p>
        <button
          onClick={onBack}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          Go Back to Assessment
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Results
          </button>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Algorithm: <span className="font-medium capitalize">{currentRecommendation.algorithm.replace('_', ' ')}</span>
            </span>
          </div>
        </div>
        
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your Career Domain Recommendations
          </h1>
          <p className="text-gray-600 mb-4">
            Based on your assessment results, here are the career domains that best match your interests and strengths.
          </p>
          <div className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-blue-800 font-medium">
              {Math.round(currentRecommendation.confidence)}% Overall Confidence Score
            </span>
          </div>
        </div>
      </div>

      {/* Reasoning */}
      {currentRecommendation.reasoning.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            Why These Recommendations?
          </h2>
          <ul className="space-y-2">
            {currentRecommendation.reasoning.map((reason, index) => (
              <li key={index} className="flex items-start text-blue-800">
                <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Domain Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentRecommendation.domains.map((recommendedDomain) => (
          <div key={recommendedDomain.domainId} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{recommendedDomain.domain.title}</h3>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded">
                      {recommendedDomain.domain.category}
                    </span>
                    <span className={`inline-block text-xs font-medium px-2 py-1 rounded ${getDifficultyColor(recommendedDomain.domain.difficulty)}`}>
                      {recommendedDomain.domain.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Rank #{recommendedDomain.rank}</p>
                </div>
              </div>

              {/* Match Score */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Match Score</span>
                  <span className={`text-sm font-bold px-2 py-1 rounded ${getMatchScoreColor(recommendedDomain.matchScore)}`}>
                    {recommendedDomain.matchScore}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${recommendedDomain.matchScore}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{getMatchScoreLabel(recommendedDomain.matchScore)}</p>
              </div>

              {/* Confidence */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Confidence</span>
                  <span className="text-sm font-medium text-blue-600">{recommendedDomain.confidence}%</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{recommendedDomain.domain.description}</p>

              {/* Stats */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Salary Range</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatSalary(
                      recommendedDomain.domain.marketData.averageSalaryRange.min, 
                      recommendedDomain.domain.marketData.averageSalaryRange.max, 
                      recommendedDomain.domain.marketData.averageSalaryRange.currency
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Job Growth</span>
                  <span className="text-sm font-medium text-green-600">+{recommendedDomain.domain.marketData.jobGrowthRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Market Score</span>
                  <span className="text-sm font-medium text-purple-600">{recommendedDomain.marketScore}/100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Time to Master</span>
                  <span className="text-sm font-medium text-gray-900">{recommendedDomain.domain.timeToMastery} months</span>
                </div>
              </div>

              {/* Skills */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Key Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {recommendedDomain.domain.requiredSkills.slice(0, 3).map((skill, index) => (
                    <span key={index} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
                      {skill.name}
                    </span>
                  ))}
                  {recommendedDomain.domain.requiredSkills.length > 3 && (
                    <span className="bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded">
                      +{recommendedDomain.domain.requiredSkills.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Reasoning */}
              {recommendedDomain.reasoning.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Why This Match?</h4>
                  <ul className="space-y-1">
                    {recommendedDomain.reasoning.slice(0, 2).map((reason, index) => (
                      <li key={index} className="text-xs text-gray-600 flex items-start">
                        <svg className="w-3 h-3 text-blue-500 mr-1 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleDomainSelect(recommendedDomain)}
                  disabled={selectedDomainId === recommendedDomain.domainId}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedDomainId === recommendedDomain.domainId ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Selecting...
                    </span>
                  ) : (
                    'Select This Domain'
                  )}
                </button>
                <button
                  onClick={() => handleViewDetails(recommendedDomain.domainId)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium"
                >
                  Details
                </button>
                <button
                  onClick={() => handleProvideFeedback(recommendedDomain)}
                  className="px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v10a2 2 0 002 2h6a2 2 0 002-2V8M9 12h6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Need Help Choosing?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Consider These Factors:</h3>
            <ul className="space-y-1">
              <li>• Match score with your interests</li>
              <li>• Salary expectations and growth potential</li>
              <li>• Required skills and learning curve</li>
              <li>• Job market demand in your area</li>
              <li>• Time to mastery and difficulty level</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">What Happens Next:</h3>
            <ul className="space-y-1">
              <li>• Get a personalized learning roadmap</li>
              <li>• Weekly targets and milestones</li>
              <li>• Progress tracking and reminders</li>
              <li>• Job recommendations upon completion</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Provide Feedback on {showFeedbackModal.domain.domain.title}
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const feedback: DomainSelection = {
                domainId: showFeedbackModal.domainId,
                rating: parseInt(formData.get('rating') as string),
                feedback: formData.get('feedback') as 'helpful' | 'not_helpful' | 'partially_helpful',
                comments: formData.get('comments') as string || undefined,
              };
              submitFeedback(feedback);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How would you rate this recommendation?
                  </label>
                  <select name="rating" required className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option value="">Select rating</option>
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Good</option>
                    <option value="3">3 - Average</option>
                    <option value="2">2 - Poor</option>
                    <option value="1">1 - Very Poor</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Was this recommendation helpful?
                  </label>
                  <select name="feedback" required className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option value="">Select option</option>
                    <option value="helpful">Yes, very helpful</option>
                    <option value="partially_helpful">Somewhat helpful</option>
                    <option value="not_helpful">Not helpful</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Comments (Optional)
                  </label>
                  <textarea 
                    name="comments"
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Tell us more about your thoughts..."
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Submit Feedback
                </button>
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(null)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};