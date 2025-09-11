import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function Home() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api.get("posts/")
      .then(res => setPosts(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h1>All Posts</h1>
      {posts.length > 0 ? (
        posts.map(post => (
          <div key={post.id} style={{ border: "1px solid #ddd", margin: "10px", padding: "10px" }}>
            <h2>{post.title}</h2>
            <p>{post.content.substring(0, 100)}...</p>
          </div>
        ))
      ) : (
        <p>No posts found</p>
      )}
    </div>
  );
}
