'use client';

// Comprehensive claim timeline visualization component
import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';

interface TimelineEvent {
  id: string;
  type: 'CREATED' | 'SUBMITTED' | 'PROCESSING' | 'APPROVED' | 'DENIED' | 'PAID' | 'DOCUMENT_UPLOADED' | 'STATUS_UPDATED' | 'APPEAL_FILED';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
  user?: string;
  status?: 'completed' | 'current' | 'upcoming';
}

interface ClaimTimelineProps {
  events: TimelineEvent[];
  currentStatus: string;
  showUpcoming?: boolean;
  compact?: boolean;
  className?: string;
}

export default function ClaimTimeline({ 
  events, 
  currentStatus, 
  showUpcoming = true, 
  compact = false,
  className = '' 
}: ClaimTimelineProps) {
  
  const getEventIcon = (type: string, status: string = 'completed') => {
    const baseClasses = "flex items-center justify-center w-8 h-8 rounded-full";
    
    const iconClasses = {
      completed: "bg-green-100 text-green-600",
      current: "bg-blue-100 text-blue-600 ring-4 ring-blue-50",
      upcoming: "bg-gray-100 text-gray-400"
    };

    const iconClass = `${baseClasses} ${iconClasses[status as keyof typeof iconClasses]}`;

    switch (type) {
      case 'CREATED':
        return (
          <div className={iconClass}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case 'SUBMITTED':
        return (
          <div className={iconClass}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
        );
      case 'PROCESSING':
        return (
          <div className={iconClass}>
            <svg className={`w-4 h-4 ${status === 'current' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        );
      case 'APPROVED':
        return (
          <div className={iconClass}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'DENIED':
        return (
          <div className={iconClass}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'PAID':
        return (
          <div className={iconClass}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        );
      case 'DOCUMENT_UPLOADED':
        return (
          <div className={iconClass}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
        );
      case 'APPEAL_FILED':
        return (
          <div className={iconClass}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L6 10l6 6 1.384-4.226a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className={iconClass}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getConnectorLine = (index: number, status: string) => {
    if (index === events.length - 1) return null;
    
    const lineClasses = {
      completed: "bg-green-200",
      current: "bg-blue-200",
      upcoming: "bg-gray-200"
    };

    return (
      <div className={`absolute left-4 top-8 w-0.5 h-8 ${lineClasses[status as keyof typeof lineClasses]}`} />
    );
  };

  const getEventStatus = (event: TimelineEvent, index: number): 'completed' | 'current' | 'upcoming' => {
    if (event.status) return event.status;
    
    // Determine status based on current claim status and event type
    const statusOrder = ['CREATED', 'SUBMITTED', 'PROCESSING', 'APPROVED', 'PAID'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const eventIndex = statusOrder.indexOf(event.type);
    
    if (eventIndex < currentIndex) return 'completed';
    if (eventIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  // Filter events based on showUpcoming
  const filteredEvents = showUpcoming 
    ? events 
    : events.filter(event => getEventStatus(event, 0) !== 'upcoming');

  if (filteredEvents.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">No timeline events available</p>
      </div>
    );
  }

  return (
    <div className={`flow-root ${className}`}>
      <ul className={`-mb-8 ${compact ? 'space-y-4' : 'space-y-6'}`}>
        {filteredEvents.map((event, eventIdx) => {
          const eventStatus = getEventStatus(event, eventIdx);
          
          return (
            <li key={event.id}>
              <div className="relative">
                {getConnectorLine(eventIdx, eventStatus)}
                
                <div className="relative flex items-start space-x-3">
                  <div className="relative">
                    {getEventIcon(event.type, eventStatus)}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className={`${compact ? 'pb-2' : 'pb-4'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            eventStatus === 'upcoming' ? 'text-gray-500' : 'text-gray-900'
                          }`}>
                            {event.title}
                          </p>
                          
                          <p className={`text-sm mt-1 ${
                            eventStatus === 'upcoming' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {event.description}
                          </p>
                          
                          {event.user && !compact && (
                            <p className="text-xs text-gray-400 mt-1">
                              by {event.user}
                            </p>
                          )}
                          
                          {event.metadata && !compact && (
                            <div className="mt-2">
                              {Object.entries(event.metadata).map(([key, value]) => (
                                <span key={key} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                                  {key}: {String(value)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right text-sm whitespace-nowrap ml-4">
                          {eventStatus !== 'upcoming' ? (
                            <>
                              <time 
                                dateTime={event.timestamp}
                                className={`${
                                  eventStatus === 'current' ? 'text-blue-600 font-medium' : 'text-gray-500'
                                }`}
                              >
                                {compact 
                                  ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })
                                  : format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')
                                }
                              </time>
                              
                              {eventStatus === 'current' && (
                                <div className="flex items-center mt-1">
                                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-1"></div>
                                  <span className="text-xs text-blue-600 font-medium">Current</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">Pending</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Progress indicator for current event */}
                      {eventStatus === 'current' && event.type === 'PROCESSING' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Processing</span>
                            <span>In Progress</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      
      {/* Timeline Summary */}
      {!compact && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {filteredEvents.filter(e => getEventStatus(e, 0) === 'completed').length} of {filteredEvents.length} steps completed
            </span>
            <span>
              Last updated: {formatDistanceToNow(new Date(Math.max(...filteredEvents.map(e => new Date(e.timestamp).getTime()))), { addSuffix: true })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}