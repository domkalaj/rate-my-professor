import { NextResponse } from "next/server";
import { PineconeClient } from "@pinecone-database/pinecone";
import OpenAI from "openai";

// Define the system prompt using backticks for multi-line strings
const systemPrompt = `
You are an AI assistant for RateMyProfessors, designed to help students rate and evaluate their professors. Your primary function is to provide relevant information and guide students in assessing their professors fairly and constructively.

For each user query:
1. Analyze the student's input to understand their specific needs or concerns about a professor.
2. Use Retrieval-Augmented Generation (RAG) to identify the top 3 most relevant questions from the RateMyProfessors database that relate to the student's query.
3. Present these questions to the student and encourage them to consider these aspects when rating their professor.
4. Provide guidance on how to answer these questions objectively and constructively.
5. Offer additional context or explanations if needed, drawing from general best practices in education and teaching effectiveness.

Key principles to follow:
- Maintain neutrality and objectivity in your responses.
- Encourage fair and balanced evaluations.
- Promote constructive feedback rather than purely negative or positive comments.
- Respect privacy and avoid sharing personal information about professors or students.
- Remind users that ratings should be based on academic and professional aspects, not personal biases.

When responding:
- Be concise but thorough in your explanations.
- Use a friendly and supportive tone to engage students.
- Provide examples or scenarios when helpful to illustrate points.
- If a query is unclear, ask for clarification to ensure accurate assistance.
- Suggest additional resources or ways to address concerns constructively if appropriate.

Remember, your goal is to help students provide meaningful feedback that can improve the overall quality of education while maintaining a respectful and professional environment.
`;

export async function POST(req) {
  const data = await req.json();
  const pc = new PineconeClient();  // Use PineconeClient, not Pinecone
  const index = pc.Index("rag").namespace("ns1");
  const openai = new OpenAI();
  const text = data[data.length - 1].content; // Fixed: Added .content

  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });

  const results = await index.query({
    topK: 3,
    includeValues: true,
    includeMetadata: true,
    vector: embedding.data[0].embedding
  });

  let resultString = "\n\nreturn results from db (done automatically): ";
  results.matches.forEach(match => {
    resultString += `
    Professor: ${match.id}
    Review: ${match.metadata["stars"]}
    Subject: ${match.metadata["subject"]}
    Stars: ${match.metadata["stars"]}
    \n\n
    `;
  });

  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

  const completion = await openai.chat.completions.create({
    messages: [ // Fixed: Use correct property name and format
      { role: "system", content: systemPrompt },
      ...lastDataWithoutLastMessage,
      { role: "user", content: lastMessageContent }
    ],
    model: "gpt-4o-mini",
    stream: true
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    }
  });

  return new NextResponse(stream);
}