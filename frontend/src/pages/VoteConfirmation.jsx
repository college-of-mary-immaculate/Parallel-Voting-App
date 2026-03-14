import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store';
import { LoadingSpinner, ErrorAlert } from '../components';

const VoteConfirmation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [voteData, setVoteData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const transactionId = searchParams.get('transactionId');
  const electionId = searchParams.get('electionId');
  const candidateId = searchParams.get('candidateId');

  useEffect(() => {
    if (!transactionId) {
      navigate('/dashboard');
      return;
    }

    fetchVoteConfirmation();
  }, [transactionId, navigate]);

  const fetchVoteConfirmation = async () => {
    setIsLoading(true);
    try {
      // Mock API call to get vote confirmation details
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockVoteData = {
        transactionId: transactionId,
        election: {
          id: electionId,
          title: 'Student Council Election 2024',
          description: 'Annual student council leadership election',
          startDate: '2024-03-01T09:00:00Z',
          endDate: '2024-03-15T17:00:00Z'
        },
        candidate: {
          id: candidateId,
          name: 'Alice Johnson',
          position: 'President',
          party: 'Progressive Party',
          photo: null
        },
        voter: {
          id: user?.id || '12345',
          name: user?.name || 'John Doe',
          email: user?.email || 'john.doe@university.edu',
          studentId: user?.studentId || '2021001'
        },
        vote: {
          timestamp: new Date().toISOString(),
          ipAddress: '192.168.1.100',
          deviceInfo: 'Chrome on Windows',
          verificationCode: 'VRC-8A3B-2C9D',
          status: 'confirmed',
          blockchainHash: '0x7f9a8b3c2d6e5f4a1b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7',
          confirmationNumber: `VC-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        },
        security: {
          encryptionUsed: 'AES-256',
          verificationMethod: 'Two-Factor Authentication',
          auditTrailId: `AUD-${Date.now()}`,
          tamperProof: true
        }
      };

      setVoteData(mockVoteData);
    } catch (err) {
      setError('Failed to load vote confirmation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmailReceipt = async () => {
    if (!voteData) return;
    
    setIsSendingEmail(true);
    try {
      // Mock API call to send email receipt
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Vote receipt has been sent to your email address!');
    } catch (err) {
      alert('Failed to send email receipt. Please try again.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!voteData) return;

    // Create receipt content
    const receiptContent = `
VOTE RECEIPT
===============

Transaction ID: ${voteData.vote.transactionId}
Confirmation Number: ${voteData.vote.confirmationNumber}
Date: ${new Date(voteData.vote.timestamp).toLocaleString()}

ELECTION DETAILS
===============
Title: ${voteData.election.title}
Description: ${voteData.election.description}
Election Period: ${new Date(voteData.election.startDate).toLocaleDateString()} - ${new Date(voteData.election.endDate).toLocaleDateString()}

CANDIDATE VOTED FOR
==================
Name: ${voteData.candidate.name}
Position: ${voteData.candidate.position}
Party: ${voteData.candidate.party}

VOTER INFORMATION
==================
Name: ${voteData.voter.name}
Email: ${voteData.voter.email}
Student ID: ${voteData.voter.studentId}

SECURITY DETAILS
================
Verification Code: ${voteData.vote.verificationCode}
Encryption: ${voteData.security.encryptionUsed}
Verification Method: ${voteData.security.verificationMethod}
Audit Trail ID: ${voteData.security.auditTrailId}
Tamper Proof: ${voteData.security.tamperProof ? 'Yes' : 'No'}

BLOCKCHAIN VERIFICATION
======================
Hash: ${voteData.vote.blockchainHash}

This receipt serves as proof of your vote. Please keep it for your records.
    `.trim();

    // Create and download file
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vote-receipt-${voteData.vote.transactionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading vote confirmation..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white shadow rounded-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!voteData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Success Header */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-green-900">Vote Successfully Cast!</h1>
                <p className="text-green-700">Your vote has been securely recorded and confirmed.</p>
              </div>
            </div>
          </div>

          {/* Transaction ID */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <div className="text-center">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Transaction ID</h2>
              <div className="bg-gray-100 rounded-lg p-4 mb-4">
                <code className="text-lg font-mono text-gray-900">{voteData.vote.transactionId}</code>
              </div>
              <p className="text-sm text-gray-600">Please save this transaction ID for your records</p>
            </div>
          </div>

          {/* Vote Details */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Vote Details</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Election Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Election Information</h4>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Election Title:</dt>
                    <dd className="text-sm font-medium text-gray-900">{voteData.election.title}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Description:</dt>
                    <dd className="text-sm text-gray-900">{voteData.election.description}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Election Period:</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(voteData.election.startDate).toLocaleDateString()} - {new Date(voteData.election.endDate).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Candidate Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Candidate Voted For</h4>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-semibold text-lg">
                      {voteData.candidate.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-lg font-medium text-gray-900">{voteData.candidate.name}</div>
                    <div className="text-sm text-gray-600">{voteData.candidate.position}</div>
                    <div className="text-sm text-gray-500">{voteData.candidate.party}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Voter Information */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Voter Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <dt className="text-sm text-gray-500">Name</dt>
                <dd className="text-sm font-medium text-gray-900">{voteData.voter.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-sm font-medium text-gray-900">{voteData.voter.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Student ID</dt>
                <dd className="text-sm font-medium text-gray-900">{voteData.voter.studentId}</dd>
              </div>
            </div>
          </div>

          {/* Security Details */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Security & Verification</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Security Details</h4>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Verification Code:</dt>
                    <dd className="text-sm font-medium text-gray-900">{voteData.vote.verificationCode}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Encryption:</dt>
                    <dd className="text-sm font-medium text-gray-900">{voteData.security.encryptionUsed}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Verification Method:</dt>
                    <dd className="text-sm font-medium text-gray-900">{voteData.security.verificationMethod}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Tamper Proof:</dt>
                    <dd className="text-sm font-medium text-green-600">Yes ✓</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Timestamp & Location</h4>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Vote Time:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {new Date(voteData.vote.timestamp).toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">IP Address:</dt>
                    <dd className="text-sm font-medium text-gray-900">{voteData.vote.ipAddress}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Device:</dt>
                    <dd className="text-sm font-medium text-gray-900">{voteData.vote.deviceInfo}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Audit Trail ID:</dt>
                    <dd className="text-sm font-medium text-gray-900">{voteData.security.auditTrailId}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Blockchain Verification */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Blockchain Verification</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">Transaction Hash:</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Verified</span>
              </div>
              <code className="text-xs text-gray-600 break-all">{voteData.vote.blockchainHash}</code>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              This vote has been recorded on the blockchain for maximum security and transparency.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Receipt Options</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={handleSendEmailReceipt}
                disabled={isSendingEmail}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {isSendingEmail ? 'Sending...' : 'Email Receipt'}
              </button>
              
              <button
                onClick={handleDownloadReceipt}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Receipt
              </button>
              
              <button
                onClick={handlePrintReceipt}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Receipt
              </button>
              
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoteConfirmation;
