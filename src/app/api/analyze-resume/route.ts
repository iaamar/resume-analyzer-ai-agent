import { NextResponse } from "next/server";
import { scrapeUrl } from "@/utils/scraper";
import { getGeminiResponse } from "@/utils/gemini";
import { Logger } from "@/utils/logger";

const logger = new Logger("analyze-resume-route");

// Hardcoded resume text - in a real app this would come from the user
const RESUME_TEXT = `
AMAR NAGARGOJE
(857) 763-9207  |  amarnagargoje.lovable.app  |  nagargoje.a@northeastern.edu  |  linkedin.com/in/amarcs
PROFESSIONAL SUMMARY
Customer oriented AI Software Engineer with 3+ YOE writing production level code. Strong in adapting  and integrating software capabilities leveraging full-stack AI web,  mobile, GenAI tools and methodologies. Engineered softwares from foundational to high-level architecture
TECHNICAL SKILLS
Languages/Databases   :  Java, Python, Swift, TypeScript, JavaScript, HTML5, CSS, SCSS, Objective-C, JSP, J2EE, Linux (Bash)
Frameworks                     :  ReactJs, NodeJs, MERN, Spring/Hibernate, Django, REST APIs, NextJs, React-Native, Redux, Flask, Terraform
Database/Cloud              :  MySQL, PostgreSQL, MongoDB, AWS (S3, EC2, Lambda, VPC, RDS, IAM, KMS, ELB), Git, Docker, Kubernetes, Jenkins
ML/GenAI	            :  Transformers, CUDA, PyTorch, AirFlow, Amazon Bedrock, Elastic MapReduce, MLOps, Pinecone, LangChain, Streamlit, 		               AWS SageMaker, Glue, MLOps, GPT-3.5/4, Claude, Pandas, Numpy, Scikit-learn, TensorFlow, HuggingFace
PROFESSIONAL EXPERIENCE
New England Insurance, Boston	 June 2024–Sept 2024
AI Software Engineer Intern	Boston, USA
Shipped production grade RAG chatbot for charles schwab’s financial data integrating VertexAI, with standard gemini models
Incorporated AI agents to perform specific analyses with multiple knowledge areas, enabling semantic search capabilities for generation
Implemented distributed backend in Java with infra on GCP for scaling and maintainability using terraform, docker and kubernetes
Coforge	July 2021 – Sept 2023
Software Engineer	   Delhi, India
Developed microservices in Java using Spring Boot and MVC patterns, employing design patterns like Singleton, Factory, and DAO for modular & scalable solutions. Enhanced UX with async data processing, contributing $240K growth for FY22
Developed RESTful APIs, enabling real-time data processing on the front end, facilitating machine learning predictions, and integrating them via AWS Bedrock. Utilized AWS SageMaker, AirFlow and EMR’s to training, feature engineer and improve model training by 30%
Configured AWS infrastructure pipeline using Docker, Terraform to provision VPCs and custom AMIs with application dependencies. Built a custom machine image pipeline to automate web application deployments using shell scripts, while integrating CI/CD workflows with GitHub Actions for continuous integration, enhanced security through EC2 Security Groups, CI checks, and IAM-based access control
Leveraged MLFlow for monitoring multiple machine learning models across different versions and datasets using S3. Implemented auto-scaling model using AWS Elastic MapReduce AutoScaling policies to dynamically adjust resources based on incoming API requests
Wrote serverless lambda functions, SQL-based background workers, conducted code reviews, and documented the SDLC, improving code quality across projects by leveraging tools like SQL Workbench, Linux, and SVN/Git
Collaborated with frontend teams to visualize 15TB+ real-time data predictions and model outputs in both web and mobile apps using Javascript and D3.js library, enhancing user comprehension of AI-driven insights
Reduced api calls for searching features by optimizing complex SQL queries for faster data retrieval, implementing triggers and procedures for caching and atomicity through RDS. Coordinated asynchronously to, reducing release delays by 25%
PROJECTS
Resume Analyser AI Agent Platform (AI Agent, DeepSeek, Ollama) Link		            Dec 2024
Architected a distributed, event-driven microservices platform on AWS EKS for real-time data processing
Developed a custom Kubernetes operator to automate data ingestion and pipeline orchestration
Engineered vector embeddings using HuggingFace Transformers for semantic similarity searches
Integrated RAG-powered LLMs for context-aware vulnerability insights and deployed a Streamlit UI for seamless user interaction
Ensured high availability, scalability, and security with Prometheus, Grafana, and IAM roles
NeuraSearch using RAG (MLOps, PyTorch, Langchain, Groq API) Demo			           Nov 2024
Developed a search engine using Retrieval-Augmented Generation (RAG) with Langchain, vectorizing PDFs and storing them in Pinecone DB for context-aware query answering. Implemented LLM-based query augmentation with Groq and Llama 3.1
create semantic embeddings using langchain’s HuggingFaceEmbeddings to enable efficient retrieval and summarization of document
Used LangChain with HuggingFace embeddings and SentenceTransformer to retrieve context from Pine Cone VectorStore
Processed PDFs using PyPDFLoader for document chunking, applying cosine similarity to optimize retrieval and deployed it on streamlit
Opti-Mind: AI Agent (AI Agents, Python, MLOps) Link 								           Nov 2024
Developed summarizer, critique and search AI agent powered by Mistral-7B-Instruct-v0.1 LLM, integrating text generation, topic modeling, and query expansion methods.
Implemented optimized search strategies using the Brave Search API with result caching, improving query response times and overall system performance for large-scale information retrieval
HumanifyAI using DPO (Python, PyTorch, DPO, LLM, Transformers, DevOps) Link 					          Sept 2024
Implemented Direct Preference Optimization (DPO) to fine-tune LLMs, improving contextual accuracy by 22%. Curated a preference-based dataset from diverse human input to enhance alignment with user expectations, increasing evaluation scores by 30%
Developed an MLOps pipeline for seamless data handling, model fine-tuning, and evaluation, resulting in a 25% boost in training efficiency
Image Captioning using PyTorch (GenAI, Image, PyTorch) Link		           Nov 2024
Coded image captioning model using a combination of CNN, LSTM, and GRU. Used pre-trained InceptionV3 for image embeddings on Flickr 8k dataset, processing 20GB of data and 8K images. Evaluated generated captions using BLEU scores and semantic distance metrics
Optimized data preprocessing with PyTorch’s DataLoader and COCO’s lazy loader, achieving a 1.41x speedup

EDUCATION
Northeastern University	   	           May 2025
Master of Science in Computer Software Engineering (GPA 3.6/4.0)	    Boston, MA
MIT Art, Design Technology University	    	          June 2021
Bachelor of Engineering in Computer Science Engineering, Major: Artificial Intelligence (1st Rank in AI Dept)	          Pune, India

`;

export async function POST(req: Request) {
  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: "URLs array is required" },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      urls.map(async url => {
        try {
          // Scrape the webpage
          const scrapedContent = await scrapeUrl(url);

          if (scrapedContent.error) {
            return {
              url,
              relevanceScore: 0,
              explanation: `Error: ${scrapedContent.error}`,
            };
          }

          // Prepare message for Gemini
          const messages = [
            {
              role: "system" as const,
              content:
                "You are a job matching assistant. Analyze the webpage content and compare it to my resume. Return a JSON object with a relevance score (0-100) and explanation. Focus on matching skills, experience, and job requirements.",
            },
            {
              role: "user" as const,
              content: `Compare the contents of my resume with the information about the company and rate how relevant it is. Determine how good of a fit I would be for a job at this company.


            <Resume>
            ${RESUME_TEXT}
            </Resume>

            <WebpageContent>
            ${scrapedContent.content}
            </WebpageContent>

            Return a JSON object with:
            1. relevanceScore (0-100) - how good of a fit I would be for a job at this company
            2. explanation (2-3 sentences explaining the score) - why the score is what it is
            `,
            },
          ];

          // Get AI analysis
          const analysis = await getGeminiResponse(messages);
          const parsedAnalysis = JSON.parse(analysis);

          return {
            url,
            relevanceScore: parsedAnalysis.relevanceScore,
            explanation: parsedAnalysis.explanation,
          };
        } catch (error) {
          logger.error(`Error analyzing URL ${url}:`, error);
          return {
            url,
            relevanceScore: 0,
            explanation: `Error analyzing URL: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      })
    );

    // Sort results by relevanceScore in descending order
    const sortedResults = results.sort(
      (a, b) => b.relevanceScore - a.relevanceScore
    );

    return NextResponse.json({ results: sortedResults });
  } catch (error) {
    logger.error("Error in analyze-resume route:", error);
    return NextResponse.json(
      { error: "Failed to analyze resume match" },
      { status: 500 }
    );
  }
}
