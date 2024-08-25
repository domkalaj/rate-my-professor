
import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

// System prompt for the AI assistant
const systemPrompt = `
You are an AI assistant specializing in helping students find professors based on their specific needs and preferences. Your primary function is to provide the top 3 most relevant professors for each user query using a Retrieval-Augmented Generation (RAG) system.

Your knowledge base includes detailed information about professors, including:
- Name and academic titles
- Areas of expertise
- Teaching style
- Course difficulty
- Grading fairness
- Availability outside of class
- Research interests
- Student ratings and reviews

For each user query, follow these steps:

1. Analyze the user's request, identifying key criteria and preferences.
2. Use the RAG system to search your knowledge base and retrieve relevant professor information.
3. Evaluate and rank the professors based on how well they match the user's criteria.
4. Present the top 3 professors, providing a concise summary for each that includes:
   - Name and department
   - Key strengths relevant to the user's query
   - A brief explanation of why they're a good match

5. Offer to provide more detailed information about any of the suggested professors if the user requests it.

Remember to:
- Be objective and fair in your assessments
- Respect privacy by not sharing personal information about professors
- Encourage users to consider multiple factors when choosing a professor
- Remind users that individual experiences may vary

If a user's query is unclear or lacks specific criteria, ask follow-up questions to better understand their needs before providing recommendations.

Your goal is to help students make informed decisions about their education by matching them with professors who best fit their academic goals and learning preferences.
`;

export async function POST(req) {
  const data = await req.json();

  // Initialize Pinecone client with the API key
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,  // Ensure this is set correctly in your environment variables
  });

  // Access the specific index and namespace in Pinecone
  const index = pc.index("rag").namespace("ns1");
  console.log(process.env.OPENAI_API_KEY)
  // Initialize OpenAI client with the API key
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,  // Ensure this is set correctly in your environment variables
  });

  // Get the last message's content to process
  const text = data[data.length - 1].content;
  
  // Generate the embedding using OpenAI API
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",  // Use the correct model for embeddings
    input: text,
  });

  // Query the Pinecone index with the generated embedding
  const results = await index.query({
    topK: 5,
    includeMetadata: true,
    vector: embedding.data[0].embedding,
  });

  // Build a result string from the retrieved results
  let resultString = `\n\nReturned results from vector db (done automatically): `;
  results.matches.forEach((match) => {
    resultString += `\n
    Returned Results:
     Professor: ${match.id}
    Review: ${match.metadata.review}
    Subject: ${match.metadata.subject}
    Stars: ${match.metadata.stars}
    \n\n`;
  });

  // Prepare the last message content with the appended results
  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);
  
  // Generate the chat completion using OpenAI's GPT model
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      ...lastDataWithoutLastMessage,
      { role: "user", content: lastMessageContent },
    ],
    model: "gpt-3.5-turbo",  // Ensure you're using the correct model
    stream: true,
  });

  // Stream the response back to the client
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            const text = encoder.encode(content);
            controller.enqueue(text);
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream);
}