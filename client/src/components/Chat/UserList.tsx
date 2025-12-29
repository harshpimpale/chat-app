import React from 'react';
import { User } from '../../utils/api';
import { Search, Users } from 'lucide-react';

interface UserListProps {
  users: User[];
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
  unreadCounts: { [userId: string]: number };
}

const UserList: React.FC<UserListProps> = ({
  users,
  selectedUser,
  onSelectUser,
  unreadCounts
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const formatLastSeen = (lastSeen?: Date | string) => {
    if (!lastSeen) return 'Never';
    const date = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-800">Messages</h2>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
          />
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium mb-1">
              {searchQuery ? 'No results found' : 'No conversations yet'}
            </p>
            <p className="text-gray-400 text-sm">
              {searchQuery ? 'Try a different search' : 'Start chatting with someone'}
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const userId = user.id || user._id || '';
            const isSelected = selectedUser &&
              (selectedUser.id === user.id || selectedUser._id === user._id);
            const unreadCount = unreadCounts[userId] || 0;

            return (
              <button
                key={userId}
                onClick={() => onSelectUser(user)}
                className={`w-full p-4 flex items-center gap-3 transition-all border-b border-gray-100 hover:bg-gray-50 ${
                  isSelected ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  {user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-semibold truncate ${
                      isSelected ? 'text-blue-700' : 'text-gray-900'
                    }`}>
                      {user.username}
                    </h3>
                    {unreadCount > 0 && (
                      <span className="flex-shrink-0 ml-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs truncate ${
                    isSelected ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {user.isOnline ? (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        Online
                      </span>
                    ) : (
                      `Last seen ${formatLastSeen(user.lastSeen)}`
                    )}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UserList;
