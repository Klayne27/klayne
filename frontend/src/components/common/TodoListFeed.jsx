// import React from "react"
// import { Link } from "react-router-dom"
// import { formatDistanceToNow } from "date-fns"
// import { useTodoStore } from "../../store/useTodoStore"

// const TodoListFeed = ({ todoLists, isLoading, isError }) => {
//   const { setSelectedTodoListId } = useTodoStore()

//   if (isLoading) return <div>Loading lists...</div>
//   if (isError) return <div>Error fetching lists.</div>
//   if (!todoLists || todoLists.length === 0)
//     return <div className="text-center text-gray-500">No public lists to show.</div>

//   return (
//     <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
//       {todoLists.map((list) => (
//         <li
//           key={list._id}
//           className="rounded-lg bg-gray-100 p-6 shadow-md transition-shadow duration-300 hover:shadow-lg"
//         >
//           <div className="flex flex-col space-y-3">
//             <div className="flex items-center gap-2">
//               <span className="text-2xl">{list.emoji}</span>
//               <h2 className="text-xl font-semibold text-gray-800">{list.name}</h2>
//             </div>
//             <Link
//               to={`/profile/${list.owner.username}`}
//               className="flex items-center gap-2 text-sm text-gray-500 hover:underline"
//             >
//               <div className="h-6 w-6 overflow-hidden rounded-full">
//                 <img
//                   src={list.owner.profileImg?.url || "/path/to/default-avatar.png"}
//                   alt="Profile"
//                   className="h-full w-full object-cover"
//                 />
//               </div>
//               @{list.owner.username}
//             </Link>
//             <p className="line-clamp-2 text-sm text-gray-500">{list.description}</p>
//             <p className="text-xs text-gray-400">
//               {formatDistanceToNow(new Date(list.createdAt))} ago
//             </p>

//             <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-3 text-sm text-gray-600">
//               <div className="flex flex-col items-center">
//                 <span className="text-lg font-bold text-gray-700">{list.totalTodos}</span>
//                 <span className="text-xs text-gray-500">Todos</span>
//               </div>
//               <div className="flex flex-col items-center">
//                 <span className="text-lg font-bold text-gray-700">{list.completedTodos}</span>
//                 <span className="text-xs text-gray-500">Completed</span>
//               </div>
//             </div>

//             <div className="pt-2">
//               <button
//                 onClick={() => setSelectedTodoListId(list._id)}
//                 className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white shadow transition-colors duration-300 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
//               >
//                 View Todos
//               </button>
//             </div>
//           </div>
//         </li>
//       ))}
//     </ul>
//   )
// }

// export default TodoListFeed
