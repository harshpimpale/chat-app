import React from 'react';
import { User } from '../../utils/api';

interface UserListProps {
  users: User[];
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
  unreadCounts: { [userId: string]: number };
}

const UserList: React.FC<UserListProps> = ({ users, selectedUser, onSelectUser, unreadCounts }) => {
  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return '';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Messages</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No users available</p>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              onClick={() => onSelectUser(user)}
              className={`p-4 border-b border-gray-100 cursor-pointer transition hover:bg-gray-50 ${
                selectedUser?.id === user.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    {user.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">
                      {user.username}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {user.isOnline ? (
                        <span className="text-green-600 font-medium">Online</span>
                      ) : (
                        formatLastSeen(user.lastSeen)
                      )}
                    </p>
                  </div>
                </div>

                {unreadCounts[user.id] > 0 && (
                  <div className="ml-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {unreadCounts[user.id]}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserList;
