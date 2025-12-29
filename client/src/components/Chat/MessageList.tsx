import React, { useEffect, useRef } from 'react';
import { Message, User } from '../../utils/api';
import { Check, CheckCheck } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  selectedUser: User | null;
  isTyping: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  selectedUser,
  isTyping
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const isSentByCurrentUser = (message: Message) => {
    let senderId: string;
    if (typeof message.sender === 'string') {
      senderId = message.sender;
    } else {
      senderId = message.sender.id || (message.sender as any)._id || '';
    }
    return senderId === currentUserId;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-4xl">💭</span>
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Select a conversation</h3>
          <p className="text-gray-500">Choose someone to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-blue-50 p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <span className="text-4xl">✨</span>
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No messages yet</h3>
          <p className="text-gray-500 text-center max-w-sm">
            Start the conversation by sending your first message!
          </p>
        </div>
      ) : (
        <>
          {messages.map((message, index) => {
            const isCurrentUser = isSentByCurrentUser(message);
            const showAvatar = index === 0 || 
              isSentByCurrentUser(messages[index - 1]) !== isCurrentUser;

            return (
              <div
                key={message._id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} items-end gap-2`}
              >
                {!isCurrentUser && (
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md ${
                    showAvatar ? 'opacity-100' : 'opacity-0'
                  }`}>
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className={`max-w-[75%] sm:max-w-md ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-4 py-2.5 rounded-2xl shadow-md ${
                      isCurrentUser
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm md:text-base break-words leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 mt-1 px-1 ${
                    isCurrentUser ? 'justify-end' : 'justify-start'
                  }`}>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.timestamp)}
                    </span>
                    {isCurrentUser && (
                      <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                    )}
                  </div>
                </div>

                {isCurrentUser && <div className="w-8"></div>}
              </div>
            );
          })}

          {isTyping && (
            <div className="flex justify-start items-end gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                {selectedUser.username.charAt(0).toUpperCase()}
              </div>
              <div className="bg-white px-5 py-3 rounded-2xl rounded-bl-sm shadow-md">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};

export default MessageList;
