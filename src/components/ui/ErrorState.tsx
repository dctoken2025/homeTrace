interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h3>
      <p className="text-gray-500 mb-4 max-w-sm">
        We couldn&apos;t load the data. Please check your connection and try again.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-white rounded-lg transition-colors"
          style={{ background: '#006AFF' }}
        >
          Try Again
        </button>
      )}
    </div>
  )
}

export function ServerError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Server Error</h3>
      <p className="text-gray-500 mb-4 max-w-sm">
        Something went wrong on our end. Please try again in a moment.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-white rounded-lg transition-colors"
          style={{ background: '#006AFF' }}
        >
          Try Again
        </button>
      )}
    </div>
  )
}

export function NotFoundError({ onGoBack }: { onGoBack?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Not Found</h3>
      <p className="text-gray-500 mb-4 max-w-sm">
        We couldn&apos;t find what you&apos;re looking for.
      </p>
      {onGoBack && (
        <button
          onClick={onGoBack}
          className="px-4 py-2 text-white rounded-lg transition-colors"
          style={{ background: '#006AFF' }}
        >
          Go Back
        </button>
      )}
    </div>
  )
}

export function PermissionError({ onGoBack }: { onGoBack?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
      <p className="text-gray-500 mb-4 max-w-sm">
        You don&apos;t have permission to access this resource.
      </p>
      {onGoBack && (
        <button
          onClick={onGoBack}
          className="px-4 py-2 text-white rounded-lg transition-colors"
          style={{ background: '#006AFF' }}
        >
          Go Back
        </button>
      )}
    </div>
  )
}

export function LoadingError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Failed</h3>
      <p className="text-gray-500 mb-4 max-w-sm">
        We couldn&apos;t load the content. Please try again.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-white rounded-lg transition-colors"
          style={{ background: '#006AFF' }}
        >
          Try Again
        </button>
      )}
    </div>
  )
}

export default function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title || 'Something went wrong'}</h3>
      <p className="text-gray-500 mb-4 max-w-sm">
        {description || 'An unexpected error occurred. Please try again.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-white rounded-lg transition-colors"
          style={{ background: '#006AFF' }}
        >
          Try Again
        </button>
      )}
    </div>
  )
}
