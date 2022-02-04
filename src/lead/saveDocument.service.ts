import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as AWS from 'aws-sdk';
import fetch from 'node-fetch';
import { getPreSignedURLForPut } from '../profile/utils/getPreSignedURLPUT';
import { Repository } from 'typeorm';
import { LeadDocument } from './entities/leadDocument.entity';

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

@Injectable()
export class SaveDocuments {
  constructor(
    @InjectRepository(LeadDocument)
    private leadDocumentRepository: Repository<LeadDocument>,
  ) {}

  saveDocuments(files, leadTitle: string) {
    const allDocuments = [];
    return new Promise(async (resolve, reject) => {
      try {
        Promise.all(
          files.map(async (file: Express.Multer.File) => {
            const leadDocument = new LeadDocument();
            const documentKey = `${Date.now()}-${file.originalname}`;
            leadDocument.name = file.originalname;
            leadDocument.documentURL = documentKey;
            leadDocument.mimeType = file.mimetype;

            // getting presigned url for document update
            const url = await getPreSignedURLForPut({
              bucketName: process.env.AWS_LEAD_DOCUMENT_BUCKET,
              key: documentKey,
            });

            //updating the lead document in s3 bucket
            const response = await fetch(url, {
              headers: {
                timeout: '0',
                processData: 'false',
                mimeType: 'multipart/form-data',
                'Content-Type': file.mimetype,
              },
              method: 'PUT',
              body: file.buffer,
            });

            if (response.status === 200) {
              allDocuments.push(leadDocument);
            }
          }),
        ).then(() => resolve({ success: 'true', allDocuments }));
      } catch (err) {
        reject({ success: 'false' });
      }
    });
  }
}
