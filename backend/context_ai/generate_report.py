import asyncio
from context_ai.agent.orchestrator import AgentOrchestrator
from context_ai.storage.mongo_store import MongoStore
from context_ai.embeddings.encoder import EmbeddingEncoder
from context_ai.retrieval.search import Retriever

async def main():
    mongo = MongoStore()
    encoder = EmbeddingEncoder()
    retriever = Retriever(mongo, encoder)
    orchestrator = AgentOrchestrator(retriever)

    prompt = "Generate a report on the class diagram and structure of the current context_ai project. Use search_context to gather information about classes, functions, and relationships. Then generate a PDF report with the title 'Context AI Project Class Diagram' and include the gathered information as content."

    result = await orchestrator.complete(prompt)
    print("Agent result:", result)

    if "output_path" in str(result):
        print("PDF generated successfully.")

if __name__ == "__main__":
    asyncio.run(main())