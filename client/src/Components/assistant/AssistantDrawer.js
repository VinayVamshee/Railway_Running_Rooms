import React from 'react';
import Drawer from '../common/Drawer';

const EXAMPLE_QUERIES = [
  'How many beds are available?',
  'Who arrived today?',
  'Which building has the most vacancies?',
  'What was the peak occupancy?',
];

export default function AssistantDrawer({ isOpen, onClose, recording, onToggleRecording, gptAnswer, userQuestion, onQueryClick }) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="✨ AI Assistant"
      subtitle="Ask about running room status using your voice"
      width="400px"
      footer={
        <button className="btn btn-secondary" onClick={onClose} style={{ width: '100%' }}>Close</button>
      }
    >
      {/* Mic control */}
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <button
          className={`mic-ring ${recording ? 'recording' : ''}`}
          onClick={onToggleRecording}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          🎤
        </button>
        <div style={{ marginTop: 10, fontSize: 12, color: recording ? 'var(--purple)' : 'var(--text-muted)' }}>
          {recording ? '● Listening...' : 'Tap to speak'}
        </div>
      </div>

      {/* Question */}
      <div>
        <div className="drawer-info-label" style={{ marginBottom: 6 }}>Your Question</div>
        <div className="assistant-question">
          {userQuestion || <span style={{ opacity: 0.5 }}>Your question will appear here after speaking...</span>}
        </div>
      </div>

      {/* Answer */}
      <div>
        <div className="drawer-info-label" style={{ marginBottom: 6 }}>Assistant Response</div>
        <div className="assistant-answer">
          {gptAnswer || <span style={{ opacity: 0.5 }}>The response will appear here...</span>}
        </div>
      </div>

      {/* Examples */}
      <div>
        <div className="drawer-info-label" style={{ marginBottom: 8 }}>Example Questions</div>
        <div className="assistant-example-queries">
          {EXAMPLE_QUERIES.map((q, i) => (
            <button key={i} className="example-query" onClick={() => onQueryClick && onQueryClick(q)}>
              {q}
            </button>
          ))}
        </div>
      </div>
    </Drawer>
  );
}
