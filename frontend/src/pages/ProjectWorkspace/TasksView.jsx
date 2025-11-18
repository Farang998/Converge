// // src/components/ProjectWorkspace/TasksView.jsx
// import React, { useState } from 'react';
// // import TaskCard from './parts/TaskCard';
// import Index from './Tasks/Index';
// import { BrowserRouter, Routes, Route } from "react-router-dom";

// const ({ tasks, toggleTaskStatus, selectTask, selectedTask }) {
//   // Use selectedTask prop passed from ProjectWorkspace to highlight the active card
//   const [query, setQuery] = useState('');
//   const filtered = tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase()));

//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<Index />} />
//         <Route path="*" element={<NotFound />} />
//       </Routes>
//     </BrowserRouter>
//   );
// }
