import React from 'react';
import ChatLayout from '../../components/chat/ChatLayout';

const AdminMessages = () => {
    return (
        <div className="container-fluid p-0">
            <h2 className="mb-4 px-3 pt-3">Messages</h2>
            <div className="px-3 pb-3">
                <ChatLayout />
            </div>
        </div>
    );
};
export default AdminMessages;
