"use client";

import { useState, useEffect } from "react";
import { User, Settings, LogOut } from "lucide-react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import "./../app/app.css";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import '@aws-amplify/ui-react/styles.css'
import { useAuthenticator } from "@aws-amplify/ui-react";
import { deletefile, goToFile } from "@/amplify/custom/file/resource";
import { sharedClient } from "@/amplify/shared/client";
import { createTodo, deleteTodo, updateTodo } from "@/amplify/custom/todo/resource";
import Image from 'next/image';
import logo from './Public/LOGO.png';
import ChatBot from './components/ChatBot';

Amplify.configure(outputs);
const client = generateClient<Schema>();

// Extended type for Todo with topic
type ExtendedTodo = Schema["Todo"]["type"] & {
  topic?: string;
  description?: string;
  fileUrl?: string;
};

export default function App() {
  const [todos, setTodos] = useState<Array<ExtendedTodo>>([]);
  const [newTodo, setNewTodo] = useState("");
  const [newTodoDescription, setNewTodoDescription] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isNewTopicModalOpen, setIsNewTopicModalOpen] = useState(false);
  const [currentTodo, setCurrentTodo] = useState<ExtendedTodo | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editFile, setEditFile] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [selectedTodo, setSelectedTodo] = useState<ExtendedTodo | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [topics, setTopics] = useState<string[]>(["Personal", "Work", "Shopping"]);
  const [selectedTopic, setSelectedTopic] = useState<string>("Personal");
  const [newTopicName, setNewTopicName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { user, signOut } = useAuthenticator();
  const [isDetachFileOpen, setIsDetachFileOpen] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [userUsername, setUsername] = useState<string>('');
  const [userPhone, setPhone] = useState<string>('');
  const [userEmail, setEmail] = useState<string>('');


  function listTodos() {
    sharedClient.models.Todo.observeQuery().subscribe({
      next: (data) => {
        // Convert the data to our extended type with topic field
        const extendedData = data.items.map(item => {
          // Parse the content for any topic data
          // This is a temporary solution until we update the schema
          // In a real app, you'd update your schema to include topic field
          const todoItem = item as ExtendedTodo;
          const content = todoItem.content || "";
          const parts = content.split("|:|");

          todoItem.content = parts[0] || "",
            todoItem.topic = parts[1] || "Personal",
            todoItem.description = parts[2] || "",
            todoItem.fileUrl = parts[3] || ""

          return todoItem;
        });
        setTodos([...extendedData]);
      },
    });
  }

  useEffect(() => {
    if (user) {
      listTodos();
    }
  }, [user]);

  // Get unique topics from todos
  const getTopicsWithCounts = () => {
    const topicCounts: Record<string, number> = {};
    topics.forEach(topic => {
      topicCounts[topic] = todos.filter(todo => todo.topic === topic).length;
    });
    return topicCounts;
  };

  const topicCounts = getTopicsWithCounts();

  const handelCreateTodo = async () => {
    if (!newTodo.trim()) {
      alert('Please enter a task title');
      return;
    }
    setIsAddingTask(true);
    try {
      await createTodo(newTodo, selectedTopic, newTodoDescription, selectedFile);
      // Reset form
      listTodos();
      setNewTodo("");
      setNewTodoDescription("");
      setSelectedFile(null);
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setIsAddingTask(false);
    }
  };

  // Add this function to handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Get todos for a specific topic
  const getTodosByTopic = (topic: string) => {
    return todos.filter(todo => todo.topic === topic);
  };

  // Open edit modal
  const openEditModal = (todo: ExtendedTodo) => {
    setCurrentTodo(todo); 
    setEditContent(todo.content || "");
    setEditDescription(todo.description || "");
    setSelectedTopic(todo.topic || "Personal");
    setEditFile(todo.fileUrl || "")
    setSelectedFile(null);
    setIsEditModalOpen(true);
  };
  
    const updateTodo = async () => {
  if (currentTodo && editContent.trim()) {
    const updatedContent = `${editContent}|:|${selectedTopic}|:|${editDescription}`;

    try {
      await client.models.Todo.update({
        id: currentTodo.id,
        content: updatedContent,
      });

      // 2. Notify backend (SNS → Email)
      const userEmail = user.signInDetails?.loginId;

      const taskTitle = editContent;

      await fetch("https://oe0vmgmtw9.execute-api.eu-north-1.amazonaws.com/dev/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: currentTodo.id,
          taskTitle: taskTitle,
          updatedContent: updatedContent,
          userEmail: userEmail,
        }),
      });

      // 3. Update selectedTodo in frontend 
      if (selectedTodo && selectedTodo.id === currentTodo.id) {
        setSelectedTodo({
          ...currentTodo,
          content: editContent,
          topic: selectedTopic,
          description: editDescription
        });
      }

      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Failed to update or notify:", error);
      alert("Failed to update task or send notification.");
    }
  }
};

  // Delete functionality
  const handelDeleteTodo = async () => {
    if (selectedTodo) {
      await deleteTodo(selectedTodo.id, selectedTodo.fileUrl);
      listTodos();
      setSelectedTodo(null);
      setIsDeleteModalOpen(false);
    }
  };

  // Toggle topic expansion
  const toggleTopic = (topic: string) => {
    if (expandedTopic === topic) {
      setExpandedTopic(null);
    } else {
      setExpandedTopic(topic);
    }
  };

  // Add new topic
  const addNewTopic = () => {
    if (newTopicName.trim() && !topics.includes(newTopicName.trim())) {
      setTopics([...topics, newTopicName.trim()]);
      setSelectedTopic(newTopicName.trim());
      setIsNewTopicModalOpen(false);
      setNewTopicName("");
    }
  };

  // Close modals
  const closeModals = () => {
    setSelectedFile(null);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsDetachFileOpen(false);
    setIsNewTopicModalOpen(false);
    setIsUserModalOpen(false);
  };

  const detachFile = async () => {
    try {
      if (selectedTodo && await deletefile(selectedTodo.fileUrl)) {
        // @ts-ignore
        updateTodo(selectedTodo.id, selectedTodo.content, selectedTodo.topic, selectedTodo.description, "", null);
        setSelectedTodo({
          ...selectedTodo,
          fileUrl: ""
        });
        listTodos();
        setEditFile("")
        closeModals();
      }
    } catch (error) {
      console.error(error)
    }
    setIsDetachFileOpen(false);
  }

    // Popup System For Profile
    const [isExpanded, setIsExpanded] = useState(false);
    const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    };

  const UserDetails = () => {
    // get user details
    const user = {username: "dummy", number:"+1234567890", email:"user@example.com"};  // replace with actual user data
    setUsername(user.username);
    setPhone(user.number);
    setEmail(user.email)
    setIsUserModalOpen(true);
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        <div className="app-container">
          <div className="sidebar">
            <div className="sidebar-header">
              <h2>Categories</h2>
              <button
                className="btn-icon-small"
                onClick={() => setIsNewTopicModalOpen(true)}
                aria-label="Add new topic"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"></path>
                </svg>
              </button>
            </div>
            <ul className="topic-list">
              {topics.map((topic) => (
                <li
                  key={topic}
                  className={`topic-item ${expandedTopic === topic ? 'expanded' : ''}`}
                  onClick={() => toggleTopic(topic)}
                >
                  <div className="topic-header">
                    <span className="topic-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {expandedTopic === topic ?
                          <path d="M19 9l-7 7-7-7"></path> :
                          <path d="M9 18l6-6-6-6"></path>
                        }
                      </svg>
                    </span>
                    <span className="topic-name">{topic}</span>
                    <span className="topic-count">{topicCounts[topic] || 0}</span>
                  </div>
                </li>
              ))}
            </ul>
            {/* Profile Section Left Container */}
            <div className="profileContainer">
                <div className="profileMain">
                    <div className="profileAvatar">
                        <User size={20} />
                    </div>
                    <div className="profileInfo">
                         <span className="profileName">{user.signInDetails?.loginId?.split('@')[0] || "Login Required"}</span>
                         <span className="profileEmail">{user.signInDetails?.loginId || "Login Required"}</span>
                    </div>
                    <button className="settingsButton"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand();
                        }}
                    >
                        <Settings size={16} />
                    </button>
                    <button className="logoutButton"
                        onClick={(e) => {
                            e.stopPropagation();
                            signOut();
                        }}
                    >
                        <LogOut size={16} />
                    </button>
                </div>
                {/* User Xtra Settings */}
                {isExpanded && (
                    <div className="profileDropdown">
                        <ul className="profileMenu">
                            <li className="profileMenuItem" onClick={UserDetails}>Profile</li>
                            <li className="profileMenuItem" onClick={signOut}>Sign out </li>
                        </ul>
                    </div>
                )}
            </div>
          </div>
          {/* Central Container */}
          <main className="main-content">
            <div className="header">
              <div className="CentralTitle">
                <Image src={logo} alt="Logo" width={75} height={75} />
                <h1 className="title">Tasks Mangment</h1>
              </div>
              <div className="task-creation-panel">
                <div className="input-group">
                  <input type="text" value={newTodo} onChange={(e) => setNewTodo(e.target.value)}
                    placeholder="New task title..." className="input" onKeyPress={(e) => e.key === "Enter" && handelCreateTodo()} />
                  <select className="select" value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)}>
                    {topics.map(topic => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>
                <textarea value={newTodoDescription} onChange={(e) => setNewTodoDescription(e.target.value)}
                placeholder="Task description (optional)..." className="textarea" rows={3} />
                <div className="button-container">
                  <input type="file" onChange={handleFileSelect} style={{ display: 'none' }} id="file-upload" key={selectedFile ? "hasFile" : "noFile"} />
                  <span className="file-name">
                    {selectedFile && 'File selected: '}
                    {selectedFile ? (
                      <a
                        href={URL.createObjectURL(selectedFile) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="file-link"
                      >
                        {selectedFile.name}
                      </a>
                    ) : (
                      'No file selected'
                    )}
                  </span>
                  <label
                    htmlFor="file-upload"
                    className="btn-primary"
                    onClick={selectedFile ? (e) => {
                      e.preventDefault();
                      setSelectedFile(null);
                    } : undefined}
                  >
                    {selectedFile ? 'Detach File' : 'Attach File'}
                  </label>
                  <button
                    onClick={handelCreateTodo}
                    className={`btn-primary ${isAddingTask ? 'loading' : ''}`}
                    disabled={isAddingTask}
                  >
                    {isAddingTask ? 'Adding...' : 'Add Task'}
                  </button>
                </div>
              </div>
            </div>

            {expandedTopic && (
              <div className="card">
                <div className="card-header">
                  <h2>{expandedTopic}</h2>
                </div>
                {getTodosByTopic(expandedTopic).length === 0 ? (
                  <div className="empty-state">No tasks in this topic</div>
                ) : (
                  <ul className="todo-list">
                    {getTodosByTopic(expandedTopic).map((todo) => (
                      <li
                        key={todo.id}
                        className={`todo-item ${selectedTodo?.id === todo.id ? 'selected' : ''}`}
                        onClick={() => setSelectedTodo(todo)}
                      >
                        <span className="todo-content">{todo.content}</span>
                        <div className="todo-actions">
                          {todo.fileUrl && (
                            <button onClick={() => goToFile(todo.fileUrl)}
                              className="btn-icon"
                              aria-label="Download file"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTodo(todo);
                              openEditModal(todo);
                            }}
                            className="btn-icon"
                            aria-label="Edit todo"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTodo(todo)
                              setIsDeleteModalOpen(true);
                            }}
                            className="btn-icon-destructive"
                            aria-label="Delete todo"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </main>

          <div className={`details-panel ${selectedTodo ? 'open' : ''}`}>
            {selectedTodo ? (
              <>
                <div className="details-header">
                  <h2>Task Details</h2>
                  <button
                    className="btn-icon-small"
                    onClick={() => setSelectedTodo(null)}
                    aria-label="Close details"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18"></path>
                      <path d="M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
                <div className="details-content">
                  <h3 className="details-title">{selectedTodo.content}</h3>
                  <div className="details-meta">
                    <span className="details-topic">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 11a9 9 0 0 1 9 9"></path>
                        <path d="M4 4a16 16 0 0 1 16 16"></path>
                        <circle cx="5" cy="19" r="1"></circle>
                      </svg>
                      {selectedTodo.topic}
                    </span>
                  </div>
                  <div className="details-description">
                    <h4>Description</h4>
                    {selectedTodo.description ? (
                      <p>{selectedTodo.description}</p>
                    ) : (
                      <p className="empty-description">No description provided</p>
                    )}
                  </div>
                  <div className="details-description">
                    <h4>Attached File</h4>
                    {selectedTodo.fileUrl ? (
                      <a
                        onClick={() => goToFile(selectedTodo.fileUrl)}
                        rel="noopener noreferrer"
                        className="file-link"
                      >{selectedTodo.fileUrl.substring(6)}</a>
                    ) : (
                      <p className="empty-description">No Attached File</p>
                    )}
                  </div>
                  <div className="details-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => openEditModal(selectedTodo)}
                    >
                      Edit Task
                    </button>
                    <button
                      className="btn-destructive"
                      onClick={() => setIsDeleteModalOpen(true)}
                    >
                      Delete Task
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-details">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <p>Select a task to view details</p>
              </div>
            )}
          </div>

          {/* Edit Modal */}
          {isEditModalOpen && (
            <div className="modal-overlay" onClick={closeModals}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Edit Task</h3>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label htmlFor="edit-title">Title</label>
                    <input
                      id="edit-title"
                      type="text"
                      className="input"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-topic">Topic</label>
                    <select
                      id="edit-topic"
                      className="select"
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                    >
                      {topics.map(topic => (
                        <option key={topic} value={topic}>{topic}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-file">File</label>
                    {editFile === "" ? (
                      <div className="file-input-wrapper">
                        <input
                          type="file"
                          onChange={handleFileSelect}
                          style={{ display: 'none' }}
                          id="file-upload"
                        />

                        <label htmlFor="file-upload" className="file_upload" onClick={selectedFile ? (e) => {
                          e.preventDefault();
                          setSelectedFile(null);
                        } : undefined}>
                          {selectedFile ? 'Detach File' : 'Attach File'}
                        </label>
                        <span className="file-name">
                          {selectedFile && 'File selected: '}
                          {selectedFile ? (
                            <a
                              href={URL.createObjectURL(selectedFile) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="file-link"
                            >
                              {selectedFile.name}
                            </a>
                          ) : (
                            'No file selected'
                          )}
                        </span>
                      </div>
                    ) : (
                      <button onClick={() => setIsDetachFileOpen(true)} className="file_upload">
                        Detach Uploaded File
                      </button>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-description">Description</label>
                    <textarea
                      id="edit-description"
                      className="textarea"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={closeModals}>
                    Cancel
                  </button>
                  <button className={`btn-primary ${isAddingTask ? 'loading' : ''}`}
                    disabled={isAddingTask}
                    onClick={updateTodo}>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Modal */}
          {isUserModalOpen && (
            <div className="modal-overlay" onClick={closeModals}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>User Details</h3>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label htmlFor="edit-username">Username</label>
                    <p>{userUsername}</p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-phone">Phone Number</label>
                    <p>{userPhone}</p>
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-phone">Email</label>
                    <p>{userEmail}</p>
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="btn-secondary" onClick={closeModals}>
                    Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Modal */}
          {isDeleteModalOpen && (
            <div className="modal-overlay" onClick={closeModals}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Delete Task</h3>
                  <button className="modal-close" onClick={closeModals}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18"></path>
                      <path d="M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete this task?</p>
                  <div className="todo-preview">
                    {selectedTodo?.content}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={closeModals}>
                    Cancel
                  </button>
                  <button className="btn-destructive" onClick={handelDeleteTodo}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* detach file */}
          {isDetachFileOpen && (
            <div className="modal-overlay" onClick={closeModals}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Detach file</h3>
                  <button className="modal-close" onClick={closeModals}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18"></path>
                      <path d="M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to detach this file from the task?</p>
                  <p style={{ color: "red" }}>It will be lost forever</p>
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={closeModals}>
                    Cancel
                  </button>
                  <button className="btn-destructive" onClick={detachFile}>
                    Detach
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* New Topic Modal */}
          {isNewTopicModalOpen && (
            <div className="modal-overlay" onClick={closeModals}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>New Topic</h3>
                  <button className="modal-close" onClick={closeModals}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18"></path>
                      <path d="M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label htmlFor="topic-name">Topic Name</label>
                    <input
                      id="topic-name"
                      type="text"
                      className="input"
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      placeholder="Enter topic name..."
                      autoFocus
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={closeModals}>
                    Cancel
                  </button>
                  <button className="btn-primary" onClick={addNewTopic}>
                    Create Topic
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="fixed bottom-4 right-4 z-50">
          <ChatBot />
        </div>
      </div>
    </div>
  );
}
