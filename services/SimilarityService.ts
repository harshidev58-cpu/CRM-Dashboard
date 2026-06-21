import { Complaint } from '@/models/Complaint';
import { getEmbedding } from '@/lib/gemini';
import mongoose from 'mongoose';

export class SimilarityService {
  /**
   * Helper function to compute cosine similarity between two vectors.
   */
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) {
      return 0;
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) {
      return 0;
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Computes and saves the vector embedding for a complaint.
   */
  static async computeAndSaveEmbedding(complaintId: string | mongoose.Types.ObjectId): Promise<number[]> {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      throw new Error(`Complaint not found: ${complaintId}`);
    }

    const textToEmbed = `${complaint.title}. Description: ${complaint.description}`;
    const embedding = await getEmbedding(textToEmbed);

    complaint.embedding = embedding;
    await complaint.save();

    return embedding;
  }

  /**
   * Finds complaints that are similar to a reference complaint.
   */
  static async findSimilarComplaints(
    complaintId: string | mongoose.Types.ObjectId,
    threshold = 0.75,
    limit = 5
  ): Promise<{ complaint: any; similarity: number }[]> {
    const target = await Complaint.findById(complaintId);
    if (!target) {
      throw new Error(`Target complaint not found: ${complaintId}`);
    }

    let targetEmbedding = target.embedding;
    if (!targetEmbedding || targetEmbedding.length === 0) {
      targetEmbedding = await this.computeAndSaveEmbedding(target._id);
    }

    // Retrieve other complaints that have embeddings.
    // In production with massive datasets, you would use Atlas Vector Search.
    // For MVP, server-side search is extremely reliable and works out of the box in local MongoDB.
    const candidates = await Complaint.find({
      _id: { $ne: target._id },
      embedding: { $exists: true, $not: { $size: 0 } }
    });

    const results: { complaint: any; similarity: number }[] = [];

    for (const candidate of candidates) {
      const similarity = this.cosineSimilarity(targetEmbedding, candidate.embedding || []);
      if (similarity >= threshold) {
        results.push({
          complaint: candidate,
          similarity: parseFloat(similarity.toFixed(4))
        });
      }
    }

    // Sort descending by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  }
}
