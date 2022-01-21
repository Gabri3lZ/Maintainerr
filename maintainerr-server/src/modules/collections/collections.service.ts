import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';

import { BasicResponseDto } from '../api/plex-api/dto/basic-response.dto';
import {
  CreateUpdateCollection,
  PlexCollection,
} from '../api/plex-api/interfaces/collection.interface';
import { PlexApiService } from '../api/plex-api/plex-api.service';
import { TmdbIdService } from '../api/tmdb-api/tmdb-id.service';
import { Collection } from './entities/collection.entities';
import { CollectionMedia } from './entities/collection_media.entities';
import { AddCollectionMedia } from './interfaces/collection-media.interface';
import { ICollection } from './interfaces/collection.interface';

interface addCollectionDbResponse {
  id: number;
  isActive: boolean;
  visibleOnHome: boolean;
  deleteAfterDays: number;
}
@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    @InjectRepository(CollectionMedia)
    private readonly CollectionMediaRepo: Repository<CollectionMedia>,
    private readonly connection: Connection,
    private readonly plexApi: PlexApiService,
    private readonly tmdbIdHelper: TmdbIdService,
  ) {}

  async getCollection(id?: number, title?: string) {
    if (title) {
      return await this.collectionRepo.findOne({ title: title });
    } else {
      return await this.collectionRepo.findOne(id);
    }
  }

  async getCollectionMedia(id: number) {
    return await this.CollectionMediaRepo.find({ collectionId: id });
  }

  async getCollections() {
    return await this.collectionRepo.find();
  }

  async createCollection(
    collection: ICollection,
    empty = true,
  ): Promise<{
    plexCollection?: PlexCollection;
    dbCollection: addCollectionDbResponse;
  }> {
    let plexCollection: PlexCollection;
    if (!empty) {
      const collectionObj: CreateUpdateCollection = {
        libraryId: collection.libraryId.toString(),
        title: collection.title,
        summary: collection?.description,
      };
      plexCollection = await this.createPlexCollection(collectionObj);
    }
    // create collection in db
    const collectionDb: addCollectionDbResponse = await this.addCollectionToDB(
      collection,
    );
    if (empty) return { dbCollection: collectionDb };
    else return { plexCollection: plexCollection, dbCollection: collectionDb };
  }
  async createCollectionWithChildren(
    collection: ICollection,
    media?: AddCollectionMedia[],
  ): Promise<{
    plexCollection: PlexCollection;
    dbCollection: addCollectionDbResponse;
  }> {
    const createdCollection = await this.createCollection(collection, false);

    for (const childMedia of media) {
      this.addChildToCollection(
        {
          plexId: +createdCollection.plexCollection.ratingKey,
          dbId: createdCollection.dbCollection.id,
        },
        childMedia.plexId,
      );
    }
    return createdCollection as {
      plexCollection: PlexCollection;
      dbCollection: addCollectionDbResponse;
    };
  }

  async addToCollection(
    collectionDbId: number,
    media: AddCollectionMedia[],
  ): Promise<Collection> {
    let collection = await this.collectionRepo.findOne(collectionDbId);

    if (!collection.plexId) {
      const newColl = await this.createPlexCollection({
        libraryId: collection.libraryId.toString(),
        title: collection.title,
        summary: collection.description,
      });
      collection = await this.collectionRepo.save({
        ...collection,
        plexId: +newColl.ratingKey,
      });
    }
    // add children to collection
    for (const childMedia of media) {
      this.addChildToCollection(
        { plexId: +collection.plexId, dbId: collection.id },
        childMedia.plexId,
      );
    }
    return collection;
  }

  async removeFromCollection(
    collectionDbId: number,
    media: AddCollectionMedia[],
  ) {
    let collection = await this.collectionRepo.findOne(collectionDbId);
    for (const childMedia of media) {
      this.removeChildFromCollection(
        { plexId: +collection.plexId, dbId: collection.id },
        childMedia.plexId,
      );
    }
    collection = await this.collectionRepo.findOne(collectionDbId);
    if (collection.collectionMedia?.length <= 0) {
      await this.plexApi.deleteCollection(collection.plexId.toString());
    }
    return await this.collectionRepo.findOne(collectionDbId);
  }

  async deleteCollection(collectionDbId: number) {
    const collection = await this.collectionRepo.findOne(collectionDbId);
    const status = await this.plexApi.deleteCollection(
      collection.plexId.toString(),
    );
    if (status.status === 'OK') {
      return await this.RemoveCollectionFromDB(collection);
    }
  } // Verwijder collectie in DB en Plex

  private async addChildToCollection(
    collectionIds: { plexId: number; dbId: number },
    childId: number,
  ) {
    const tmdbId: number = await this.tmdbIdHelper.getTmdbIdFromPlexRatingKey(
      childId.toString(),
    );
    const responseColl: PlexCollection | BasicResponseDto =
      await this.plexApi.addChildToCollection(
        collectionIds.plexId.toString(),
        childId.toString(),
      );
    if ('ratingKey' in responseColl) {
      await this.connection
        .createQueryBuilder()
        .insert()
        .into(CollectionMedia)
        .values([
          {
            collectionId: collectionIds.dbId,
            plexId: childId,
            addDate: new Date().toDateString(),
            tmdbId: tmdbId,
          },
        ])
        .execute();
    } else {
      // log error: Couldn't add media to collection
    }
  }

  private async removeChildFromCollection(
    collectionIds: { plexId: number; dbId: number },
    childId: number,
  ) {
    const responseColl: BasicResponseDto =
      await this.plexApi.deleteChildFromCollection(
        collectionIds.plexId.toString(),
        childId.toString(),
      );
    if (responseColl.status === 'OK') {
      await this.connection
        .createQueryBuilder()
        .delete()
        .from(CollectionMedia)
        .where([
          {
            collectionId: collectionIds.dbId,
            plexId: childId,
          },
        ])
        .execute();
    } else {
      // log error: Couldn't remove media from collection
    }
  }

  private async addCollectionToDB(
    collection: ICollection,
    plexId?: number,
  ): Promise<addCollectionDbResponse> {
    try {
      return (
        await this.connection
          .createQueryBuilder()
          .insert()
          .into(Collection)
          .values([
            {
              title: collection.title,
              description: collection?.description,
              plexId: plexId,
              libraryId: collection.libraryId,
              isActive: collection.isActive,
              visibleOnHome: collection?.visibleOnHome,
              deleteAfterDays: collection?.deleteAfterDays,
            },
          ])
          .execute()
      ).generatedMaps[0] as addCollectionDbResponse;
    } catch (_err) {
      // Log error
      console.log('failed creating DB collection');
    }
  }

  private async RemoveCollectionFromDB(
    collection: ICollection,
  ): Promise<BasicResponseDto> {
    try {
      await this.connection
        .createQueryBuilder()
        .delete()
        .from(Collection)
        .where([
          {
            id: collection.id,
          },
        ])
        .execute();
      return { status: 'OK', code: 1, message: 'Success' };
    } catch (_err) {
      return { status: 'NOK', code: 0, message: 'Removing from DB failed' };
    }
  }

  private async createPlexCollection(
    collectionData: CreateUpdateCollection,
  ): Promise<PlexCollection> {
    // create collection in plex
    return (await this.plexApi.createCollection(collectionData))[0];
  }
}