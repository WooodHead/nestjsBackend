import { Lead_Status_Type } from './../lead/types/leadStatus';
import { ElasticSearchLead } from './types/elasticSearchRecord';
import { HttpService, Injectable } from '@nestjs/common';
import { CreateElasticsearchDto } from './dto/create-elasticsearch.dto';
import { UpdateElasticsearchDto } from './dto/update-elasticsearch.dto';
import axios from 'axios';
import * as aws4 from 'aws4';
import { BuyerStatus } from 'src/lead/utils/buyerStatus';

@Injectable()
export class ElasticsearchService {

  constructor(
  ) { }

  private baseESUrl: string = process.env.ES_BASE_URL

  async create(lead_id: string, elasticSearchRecord: ElasticSearchLead) {
    try {
      const appendPath = `/leads/_doc/${lead_id}`;
      const data = elasticSearchRecord;
      let createLead = await this.sendRequest('POST', appendPath, data);

      if (!(createLead && (createLead.status == 200 || createLead.status == 201))) {
        return {
          success: false
        }
      }

      return {
        success: true,
        data: createLead.data
      }

    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: error
      }
    }
  }

  async searchData(payload) {
    try {
      const appendPath = `/leads/_search`;
      let searchLeads = await this.sendRequest('POST', appendPath, payload);
      if (searchLeads && searchLeads.status == 200 && searchLeads.data) {
        return {
          success: true,
          data: searchLeads.data?.hits ? searchLeads.data.hits?.hits : [],
          dataTotal: searchLeads.data?.hits.total.value || 0
        }
      } else {
        return {
          success: false
        }
      }
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: error
      }
    }
  }

  async removeRecord(lead_id: string) {
    try {

      if(!lead_id) {
        return {
          success: false,
          message: "Please provide valid record id!"
        }
      }
      const appendPath = `/leads/_doc/${lead_id}?timeout=5m`;
      let searchLeads = await axios(aws4.sign({
        host: process.env.ES_HOST,
        method: 'DELETE',
        url: String(this.baseESUrl).concat(appendPath),
        path: appendPath
      }, {
        accessKeyId: process.env.ES_ACCESS_KEY,
        secretAccessKey: process.env.ES_SECRET_ACCESS_KEY
      }))
 
      if (searchLeads && searchLeads.status == 200 && searchLeads.data) {
        return {
          success: true,
          data: searchLeads.data
        }
      } else {
        return {
          success: false
        }
      }
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: error
      }
    }
  }

  async updateStatus(lead_id: string, updatedStatus: BuyerStatus) {
    try {

      const appendPath = `/leads/_doc/${lead_id}/_update`;
      let payload = {
        "script": `ctx._source.leadStatus = '${updatedStatus}'`
      }
      let updateStatus = await this.sendRequest('POST', appendPath, payload);
      if (updateStatus && updateStatus.status == 200 && updateStatus.data) {
        return {
          success: true,
          data: updateStatus.data
        }
      } else {
        return {
          success: false
        }
      }
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: error
      }
    }
  }

  // helpers method
  async sendRequest(
    method: 'POST' | 'PUT' | 'DELETE',
    appendPath: string,
    data: any,
  ) {

    return await axios(aws4.sign({
      host: process.env.ES_HOST,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      url: String(this.baseESUrl).concat(appendPath),
      data,
      body: JSON.stringify(data),
      path: appendPath

    }, {
      accessKeyId: process.env.ES_ACCESS_KEY,
      secretAccessKey: process.env.ES_SECRET_ACCESS_KEY
    }))
  }

}
