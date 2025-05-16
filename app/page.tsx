"use client";

import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import "./../app/app.css";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import '@aws-amplify/ui-react/styles.css'
import { useAuthenticator } from "@aws-amplify/ui-react";
import { uploadData } from "aws-amplify/storage";
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isNewTopicModalOpen, setIsNewTopicModalOpen] = useState(false);
  const [currentTodo, setCurrentTodo] = useState<ExtendedTodo | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [selectedTodo, setSelectedTodo] = useState<ExtendedTodo | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [topics, setTopics] = useState<string[]>(["Personal", "Work", "Shopping"]);
  const [selectedTopic, setSelectedTopic] = useState<string>("Personal");
  const [newTopicName, setNewTopicName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { user, signOut } = useAuthenticator();
  function listTodos() {
    client.models.Todo.observeQuery().subscribe({
      next: (data) => {
        // Convert the data to our extended type with topic field
        const extendedData = data.items.map(item => {
          // Parse the content for any topic data
          // This is a temporary solution until we update the schema
          // In a real app, you'd update your schema to include topic field
          const todoItem = item as ExtendedTodo;
          if (!todoItem.topic) {
            todoItem.topic = "Personal"; // Default topic
          }
          if (!todoItem.description) {
            todoItem.description = ""; // Default empty description
          }
          if (!todoItem.fileUrl) {
            todoItem.fileUrl = ""; // Default empty file URL
          }
          return todoItem;
        });
        setTodos([...extendedData]);
      },
    });
  }

  useEffect(() => {
    console.log("Current user:", user);
    if (user) {
      console.log("Fetching todos for user:", user.username);
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

  // Create functionality
  const createTodo = () => {
    if (newTodo.trim()) {
      // In a real app, you'd update your schema to include topic
      // For now, we'll store it in the content field with a special prefix
      client.models.Todo.create({
        content: `${newTodo}|:|${selectedTopic}|:|${newTodoDescription}`
      });
      setNewTodo("");
      setNewTodoDescription("");
    }
  };

  const handleCreateWithFile = async () => {
    if (!newTodo.trim()) {
      alert('Please enter a task title');
      return;
    }

    try {
      let fileUrl = '';
      if (selectedFile) {
        const result = await uploadData({
          path: `files/${selectedFile.name}`,
          data: selectedFile,
          options: {
            // Specify a target bucket using name assigned in Amplify Backend
            bucket: {
              bucketName:'amplify-d2a1qc3q0pxa7d-de-gaasstoragebucket84ca08f-hw5ds4l9qiuh',
              region: 'eu-north-1'
            }
          }
        }).result;
        fileUrl = result.path;
      }

      // Create todo with file attachment
      await client.models.Todo.create({
        content: `${newTodo}|:|${selectedTopic}|:|${newTodoDescription}|:|${fileUrl}`
      });

      // Reset form
      setNewTodo("");
      setNewTodoDescription("");
      setSelectedFile(null);
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    }
  };

  // Add this function to handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };
  // Process content field to extract topic and description
  const processTodoContent = (todo: Schema["Todo"]["type"]): ExtendedTodo => {
    const content = todo.content || "";
    const parts = content.split("|:|");

    return {
      ...todo,
      content: parts[0] || "",
      topic: parts[1] || "Personal",
      description: parts[2] || "",
      fileUrl: parts[3] || ""
    };
  };

  // Process todos to display with topics
  const processTodos = () => {
    return todos.map(processTodoContent);
  };

  const processedTodos = processTodos();

  // Get todos for a specific topic
  const getTodosByTopic = (topic: string) => {
    return processedTodos.filter(todo => todo.topic === topic);
  };

  // Open edit modal
  const openEditModal = (todo: ExtendedTodo) => {
    const processedTodo = processTodoContent(todo);
    setCurrentTodo(processedTodo);
    setEditContent(processedTodo.content || "");
    setEditDescription(processedTodo.description || "");
    setSelectedTopic(processedTodo.topic || "Personal");
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


  // Open delete modal
  const openDeleteModal = (todo: ExtendedTodo) => {
    setCurrentTodo(todo);
    setIsDeleteModalOpen(true);
  };

  // Delete functionality
  const deleteTodo = () => {
    if (currentTodo) {
      client.models.Todo.delete({ id: currentTodo.id });

      // If the deleted todo was selected, clear selection
      if (selectedTodo && selectedTodo.id === currentTodo.id) {
        setSelectedTodo(null);
      }

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

  // Select a todo to view details
  const selectTodo = (todo: ExtendedTodo) => {
    const processedTodo = processTodoContent(todo);
    setSelectedTodo(processedTodo);
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
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsNewTopicModalOpen(false);
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Topics</h2>
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
              {expandedTopic === topic && (
                <ul className="topic-todos">
                  {getTodosByTopic(topic).map((todo) => (
                    <li
                      key={todo.id}
                      className={`topic-todo-item ${selectedTodo?.id === todo.id ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectTodo(todo);
                      }}
                    >
                      {todo.content}
                    </li>
                  ))}
                  {getTodosByTopic(topic).length === 0 && (
                    <li className="topic-todo-empty">No tasks</li>
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      <main className="main-content">
        <div className="header">
          <h1 className="title">{user.signInDetails?.loginId}'s Tasks</h1>
          <div className="task-creation-panel">
            <div className="input-group">
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="New task title..."
                className="input"
                onKeyPress={(e) => e.key === "Enter" && handleCreateWithFile()}
              />
              <select
                className="select"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
              >
                {topics.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>
            <textarea
              value={newTodoDescription}
              onChange={(e) => setNewTodoDescription(e.target.value)}
              placeholder="Task description (optional)..."
              className="textarea"
              rows={3}
            />
            <div className="button-container">
              <input
                type="file"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="file-upload"
              />
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
              <label htmlFor="file-upload" className="btn-primary" onClick={selectedFile ? (e) => {
                e.preventDefault();
                setSelectedFile(null);
              } : undefined}>
                {selectedFile ? 'Detach File' : 'Attach File'}
              </label>
              <button onClick={handleCreateWithFile} className="btn-primary">
                Add Task
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
                    onClick={() => selectTodo(todo)}
                  >
                    <span className="todo-content">{todo.content}</span>
                    <div className="todo-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
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
                          openDeleteModal(todo);
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
              <div className="details-actions">
                <button
                  className="btn-secondary"
                  onClick={() => openEditModal(selectedTodo)}
                >
                  Edit Task
                </button>
                <button
                  className="btn-destructive"
                  onClick={() => openDeleteModal(selectedTodo)}
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
              <button className="modal-close" onClick={closeModals}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18"></path>
                  <path d="M6 6l12 12"></path>
                </svg>
              </button>
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
              <button className="btn-primary" onClick={updateTodo}>
                Save Changes
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
                {currentTodo?.content}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModals}>
                Cancel
              </button>
              <button className="btn-destructive" onClick={deleteTodo}>
                Delete
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
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}
