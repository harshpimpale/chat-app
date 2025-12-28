import React from 'react';
import { User } from '../../utils/api';

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

  return (
    <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Messages</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {users.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No users available</p>
          </div>
        ) : (
          users.map((user) => {
            const userId = user.id || user._id || '';
            const isSelected = selectedUser && 
              (selectedUser.id === user.id || selectedUser._id === user._id);
            const unreadCount = unreadCounts[userId] || 0;

            return (
              <button
                key={userId}
                onClick={() => onSelectUser(user)}
                className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-blue-50' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  {user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>

                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 truncate">
                      {user.username}
                    </h3>
                    {unreadCount > 0 && (
                      <span className="ml-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {user.isOnline ? (
                      <span className="text-green-600">● Online</span>
                    ) : (
                      <span>Last seen: {formatLastSeen(user.lastSeen)}</span>
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
