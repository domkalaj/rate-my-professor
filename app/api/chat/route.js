import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

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
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = pc.index("rag").namespace("ns1");
  const openai = new OpenAI();

  const text = data[data.length - 1].content;
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  const results = await index.query({
    topK: 5,
    includeMetadata: true,
    vector: embedding.data[0].embedding,
  });

  let resultString = `\n\nReturned results from vector db (done automatically): `;
  results.matches.forEach((match) => {
    resultString += `\n
    Returned Results:
     Professor: ${match.id}
    Review: ${match.metadata.stars}
    Subject: ${match.metadata.subject}
    Stars: ${match.metadata.stars}
    \n\n`;
  });

  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      ...lastDataWithoutLastMessage,
      { role: "user", content: lastMessageContent },
    ],
    model: "gpt-3.5-turbo",
    stream: true,
  });

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
