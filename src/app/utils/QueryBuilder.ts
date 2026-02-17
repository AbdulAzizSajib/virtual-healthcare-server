import {
  IQueryConfig,
  IQueryParams,
  IQueryResult,
  PrismaCountArgs,
  PrismaFindManyArgs,
  PrismaModelDelegate,
  PrismaNumberFilter,
  PrismaStringFilter,
  PrismaWhereConditions,
} from "../interfaces/query.interface";

/**
 * QueryBuilder Class - একটি powerful query building system
 *
 * এই ক্লাসটি API request থেকে query parameters নিয়ে Prisma query তৈরি করে
 * উদাহরণ: /doctors?searchTerm=john&page=1&sortBy=name&specialty=cardiology
 *
 * T = Model Type (Doctor, Patient, Appointment ইত্যাদি যেকোনো Prisma model)
 * TWhereInput = Where condition এর type
 * TInclude = Include relation এর type
 */
export class QueryBuilder<
  T,
  TWhereInput = Record<string, unknown>,
  TInclude = Record<string, unknown>,
> {
  // query: মূল Prisma findMany query যা database এ execute হবে
  private query: PrismaFindManyArgs;

  // countQuery: মোট কতগুলো record আছে তা count করার জন্য
  private countQuery: PrismaCountArgs;

  // page: বর্তমান page number (default: 1)
  private page: number = 1;

  // limit: প্রতি page এ কতগুলো record দেখাবে (default: 10)
  private limit: number = 10;

  // skip: কতগুলো record skip করতে হবে (pagination এর জন্য)
  private skip: number = 0;

  // sortBy: কোন field দিয়ে sort করবে (default: createdAt)
  private sortBy: string = "createdAt";

  // sortOrder: ascending নাকি descending order এ sort করবে
  private sortOrder: "asc" | "desc" = "desc";

  // selectFields: নির্দিষ্ট fields select করার জন্য
  private selectFields: Record<string, boolean> | undefined;

  /**
   * Constructor - QueryBuilder এর শুরুতে কি কি লাগবে তা নির্ধারণ করে
   *
   * @param model - যে Prisma model এর উপর query চালাবো (prisma.doctor, prisma.patient)
   * @param queryParams - URL থেকে আসা query parameters (req.query)
   * @param config - searchableFields, filterableFields ইত্যাদি configuration
   */
  constructor(
    private model: PrismaModelDelegate,
    private queryParams: IQueryParams,
    private config: IQueryConfig = {},
  ) {
    // মূল query এর initial structure তৈরি করা
    this.query = {
      where: {}, // filtering conditions রাখবে
      include: {}, // relations include করবে
      orderBy: {}, // sorting order রাখবে
      skip: 0, // কতগুলো record skip করবে
      take: 10, // কতগুলো record নিবে
    };

    // count query শুধু total records সংখ্যা বের করার জন্য
    this.countQuery = {
      where: {}, // filtering conditions (query এর মতোই)
    };
  }

  /**
   * search() - searchTerm দিয়ে multiple fields এ search করার জন্য
   *
   * উদাহরণ: /doctors?searchTerm=john
   * এটি doctor এর name, email, specialty title ইত্যাদিতে "john" খুঁজবে
   *
   * searchableFields থেকে কোন কোন field এ search করা যাবে তা জানা যায়
   * উদাহরণ: ['user.name', 'user.email', 'specialties.specialty.title']
   */
  search(): this {
    // part-4
    // queryParams থেকে searchTerm নিয়ে আসা
    const { searchTerm } = this.queryParams;

    // config থেকে searchableFields নিয়ে আসা
    const { searchableFields } = this.config;

    // doctorSearchableFields = ['user.name', 'user.email', 'specialties.specialty.title' , 'specialties.specialty.description']

    // যদি searchTerm থাকে এবং searchableFields array তে কিছু থাকে
    if (searchTerm && searchableFields && searchableFields.length > 0) {
      // প্রতিটি searchable field এর জন্য একটি search condition তৈরি করা
      const searchConditions: Record<string, unknown>[] = searchableFields.map(
        (field) => {
          // যদি field এ dot (.) থাকে, মানে এটি nested relation field
          // উদাহরণ: 'user.name' অথবা 'specialties.specialty.title'
          if (field.includes(".")) {
            const parts = field.split("."); // dot দিয়ে ভাগ করা

            // যদি 2 টি অংশ থাকে (উদাহরণ: 'user.name')
            if (parts.length === 2) {
              const [relation, nestedField] = parts as [string, string];
              // relation = 'user', nestedField = 'name'

              // Prisma এর string filter তৈরি করা
              const stringFilter: PrismaStringFilter = {
                contains: searchTerm, // searchTerm টি contain করে কিনা
                mode: "insensitive" as const, // case-insensitive (JOHN/john/John সবই পাবে)
              };

              // Nested relation এর জন্য query structure
              // { user: { name: { contains: 'john', mode: 'insensitive' } } }
              return {
                [relation]: {
                  [nestedField]: stringFilter,
                },
              };
            }
            // যদি 3 টি অংশ থাকে (উদাহরণ: 'specialties.specialty.title')
            else if (parts.length === 3) {
              const [relation, nestedRelation, nestedField] = parts as [
                string,
                string,
                string,
              ];
              // relation = 'specialties', nestedRelation = 'specialty', nestedField = 'title'

              const stringFilter: PrismaStringFilter = {
                contains: searchTerm,
                mode: "insensitive" as const,
              };

              // Array relation এর জন্য 'some' ব্যবহার করা হয়
              // মানে: array এর যেকোনো একটি item condition match করলেই হবে
              // { specialties: { some: { specialty: { title: { contains: 'cardio' } } } } }
              return {
                [relation]: {
                  some: {
                    [nestedRelation]: {
                      [nestedField]: stringFilter,
                    },
                  },
                },
              };
            }
          }

          // যদি dot না থাকে, মানে এটি direct field (উদাহরণ: 'name' বা 'email')
          const stringFilter: PrismaStringFilter = {
            contains: searchTerm,
            mode: "insensitive" as const,
          };

          // Direct field এর জন্য সহজ query
          // { name: { contains: 'john', mode: 'insensitive' } }
          return {
            [field]: stringFilter,
          };
        },
      );

      // মূল query এর where condition এ searchConditions add করা
      const whereConditions = this.query.where as PrismaWhereConditions;

      // OR operator ব্যবহার করা - যেকোনো একটি condition match করলেই হবে
      // { OR: [{ user: { name: {contains: 'john'} } }, { user: { email: {contains: 'john'} } }] }
      whereConditions.OR = searchConditions;

      // count query তেও same condition add করা
      const countWhereConditions = this.countQuery
        .where as PrismaWhereConditions;
      countWhereConditions.OR = searchConditions;
    }

    // 'this' return করা যাতে method chaining করা যায়
    // উদাহরণ: queryBuilder.search().filter().paginate()
    return this;
  }
  /**
   * filter() - URL query parameters থেকে filtering করার জন্য
   *
   * উদাহরণ: /doctors?specialty=cardiology&appointmentFee[lt]=100
   * এটি শুধু cardiology specialty এর doctors যাদের fee 100 এর কম তাদের দেখাবে
   *
   * Support করে:
   * - Direct filtering: ?specialty=cardiology
   * - Nested filtering: ?user.name=John
   * - Range filtering: ?appointmentFee[lt]=100&appointmentFee[gt]=50
   * - Deep nested: ?specialties.specialty.title=Cardiology
   */
  filter(): this {
    const { filterableFields } = this.config;

    // এই fields গুলো filtering এ ব্যবহার করা যাবে না, এগুলো অন্য কাজে লাগে
    const excludedField = [
      "searchTerm", // search method এ ব্যবহার হয়
      "page", // pagination এ ব্যবহার হয়
      "limit", // pagination এ ব্যবহার হয়
      "sortBy", // sorting এ ব্যবহার হয়
      "sortOrder", // sorting এ ব্যবহার হয়
      "fields", // field selection এ ব্যবহার হয়
      "include", // relation include করতে ব্যবহার হয়
    ];

    // শুধু filter করার parameters আলাদা করে নেওয়া
    const filterParams: Record<string, unknown> = {};

    // সব query parameters এর মধ্যে loop চালানো
    Object.keys(this.queryParams).forEach((key) => {
      // যদি excluded field না হয় তাহলে filterParams এ add করা
      if (!excludedField.includes(key)) {
        filterParams[key] = this.queryParams[key];
      }
    });
    // ফলাফল: { specialty: 'cardiology', appointmentFee: { lt: '100' } }

    // query এবং countQuery এর where condition reference নেওয়া
    const queryWhere = this.query.where as Record<string, unknown>;
    const countQueryWhere = this.countQuery.where as Record<string, unknown>;

    // প্রতিটি filter parameter process করা
    Object.keys(filterParams).forEach((key) => {
      const value = filterParams[key];

      // যদি value undefined বা empty string হয় তাহলে skip করা
      if (value === undefined || value === "") {
        return;
      }

      // check করা যে এই field filtering এর জন্য allowed কিনা
      const isAllowedField =
        !filterableFields || // যদি filterableFields না থাকে (সব allowed)
        filterableFields.length === 0 || // অথবা empty array (সব allowed)
        filterableFields.includes(key); // অথবা এই specific field allowed

      // doctorFilterableFields = ['specialties.specialty.title', 'appointmentFee']
      // /doctors?appointmentFee[lt]=100&appointmentFee[gt]=50 => { appointmentFee: { lt: '100', gt: '50' } }

      // যদি key তে dot (.) থাকে, মানে nested/relation field
      // উদাহরণ: 'user.name' বা 'specialties.specialty.title'
      if (key.includes(".")) {
        const parts = key.split(".");

        // যদি filterableFields তে এই field না থাকে তাহলে skip
        if (filterableFields && !filterableFields.includes(key)) {
          return;
        }

        // যদি 2 টি অংশ থাকে (উদাহরণ: 'user.name=John')
        if (parts.length === 2) {
          const [relation, nestedField] = parts as [string, string];
          // relation = 'user', nestedField = 'name'

          // যদি এই relation এর জন্য object না থাকে তাহলে তৈরি করা
          if (!queryWhere[relation]) {
            queryWhere[relation] = {};
            countQueryWhere[relation] = {};
          }

          // relation object এর reference নেওয়া
          const queryRelation = queryWhere[relation] as Record<string, unknown>;
          const countRelation = countQueryWhere[relation] as Record<
            string,
            unknown
          >;

          // nested field এ value set করা
          // ফলাফল: { user: { name: 'John' } }
          queryRelation[nestedField] = this.parseFilterValue(value);
          countRelation[nestedField] = this.parseFilterValue(value);
          return;
        }
        // যদি 3 টি অংশ থাকে (উদাহরণ: 'specialties.specialty.title=Cardiology')
        else if (parts.length === 3) {
          const [relation, nestedRelation, nestedField] = parts as [
            string,
            string,
            string,
          ];
          // relation = 'specialties', nestedRelation = 'specialty', nestedField = 'title'

          // যদি relation object না থাকে তাহলে 'some' সহ তৈরি করা
          // 'some' মানে array এর যেকোনো item match করলেই হবে
          if (!queryWhere[relation]) {
            queryWhere[relation] = {
              some: {},
            };
            countQueryWhere[relation] = {
              some: {},
            };
          }

          const queryRelation = queryWhere[relation] as Record<string, unknown>;
          const countRelation = countQueryWhere[relation] as Record<
            string,
            unknown
          >;

          // যদি 'some' না থাকে তাহলে তৈরি করা
          if (!queryRelation.some) {
            queryRelation.some = {};
          }
          if (!countRelation.some) {
            countRelation.some = {};
          }

          const querySome = queryRelation.some as Record<string, unknown>;
          const countSome = countRelation.some as Record<string, unknown>;

          // nested relation এর জন্য object তৈরি করা
          if (!querySome[nestedRelation]) {
            querySome[nestedRelation] = {};
          }

          if (!countSome[nestedRelation]) {
            countSome[nestedRelation] = {};
          }

          const queryNestedRelation = querySome[nestedRelation] as Record<
            string,
            unknown
          >;
          const countNestedRelation = countSome[nestedRelation] as Record<
            string,
            unknown
          >;

          // সবশেষে value set করা
          // ফলাফল: { specialties: { some: { specialty: { title: 'Cardiology' } } } }
          queryNestedRelation[nestedField] = this.parseFilterValue(value);
          countNestedRelation[nestedField] = this.parseFilterValue(value);

          return;
        }
      }

      // যদি field allowed না হয় তাহলে skip করা
      if (!isAllowedField) {
        return;
      }

      // Range filter parsing
      // উদাহরণ: appointmentFee[lt]=100 => { appointmentFee: { lt: 100 } }
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        queryWhere[key] = this.parseRangeFilter(
          value as Record<string, string | number>,
        );
        countQueryWhere[key] = this.parseRangeFilter(
          value as Record<string, string | number>,
        );
        return;
      }

      // Direct value parsing
      // উদাহরণ: specialty=cardiology => { specialty: 'cardiology' }
      queryWhere[key] = this.parseFilterValue(value);
      countQueryWhere[key] = this.parseFilterValue(value);
    });

    // method chaining এর জন্য 'this' return করা
    return this;
  }

  /**
   * paginate() - Pagination করার জন্য (data কে page আকারে ভাগ করা)
   *
   * উদাহরণ: /doctors?page=2&limit=10
   * এটি 2য় page এর 10টি doctor দেখাবে (11-20 নম্বর doctors)
   *
   * কিভাবে কাজ করে:
   * page=1, limit=10 => skip=0, take=10 (প্রথম 10টি)
   * page=2, limit=10 => skip=10, take=10 (11-20 নম্বর)
   * page=3, limit=10 => skip=20, take=10 (21-30 নম্বর)
   */
  paginate(): this {
    // URL থেকে page number নেওয়া, না থাকলে default 1
    const page = Number(this.queryParams.page) || 1;

    // URL থেকে limit নেওয়া, না থাকলে default 10
    const limit = Number(this.queryParams.limit) || 10;

    // class properties তে save করা
    this.page = page;
    this.limit = limit;

    // skip = কতগুলো record বাদ দিতে হবে
    // উদাহরণ: page=3, limit=10 => skip = (3-1)*10 = 20
    // মানে প্রথম 20টি বাদ দিয়ে পরের 10টি নিবে
    this.skip = (page - 1) * limit;

    // Prisma query তে skip এবং take set করা
    this.query.skip = this.skip; // কতগুলো skip করবে
    this.query.take = this.limit; // কতগুলো নিবে

    return this;
  }

  /**
   * sort() - Data sort/order করার জন্য
   *
   * উদাহরণ: /doctors?sortBy=name&sortOrder=asc
   * এটি doctors কে name অনুযায়ী A-Z (ascending) order এ সাজাবে
   *
   * sortOrder:
   * - asc = ascending (ছোট থেকে বড়, A-Z, 1-10)
   * - desc = descending (বড় থেকে ছোট, Z-A, 10-1)
   */
  sort(): this {
    // URL থেকে sortBy নেওয়া, না থাকলে default 'createdAt'
    const sortBy = this.queryParams.sortBy || "createdAt";

    // URL থেকে sortOrder নেওয়া, 'asc' ছাড়া সব 'desc' হবে
    const sortOrder = this.queryParams.sortOrder === "asc" ? "asc" : "desc";

    // class properties তে save করা
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;

    // উদাহরণ: /doctors?sortBy=user.name&sortOrder=asc
    // ফলাফল: orderBy: { user: { name: 'asc' } }

    // যদি sortBy তে dot (.) থাকে, মানে nested/relation field
    if (sortBy.includes(".")) {
      const parts = sortBy.split(".");

      // যদি 2 টি অংশ থাকে (উদাহরণ: 'user.name')
      if (parts.length === 2) {
        const [relation, nestedField] = parts as [string, string];
        // relation = 'user', nestedField = 'name'

        // Nested sorting
        // ফলাফল: { user: { name: 'asc' } }
        this.query.orderBy = {
          [relation]: {
            [nestedField]: sortOrder,
          },
        };
      }
      // যদি 3 টি অংশ থাকে (উদাহরণ: 'specialties.specialty.title')
      else if (parts.length === 3) {
        const [relation, nestedRelation, nestedField] = parts as [
          string,
          string,
          string,
        ];

        // Deep nested sorting
        // ফলাফল: { specialties: { specialty: { title: 'asc' } } }
        this.query.orderBy = {
          [relation]: {
            [nestedRelation]: {
              [nestedField]: sortOrder,
            },
          },
        };
      } else {
        // অন্য কোনো case এ direct field হিসেবে treat করা
        this.query.orderBy = {
          [sortBy]: sortOrder,
        };
      }
    } else {
      // যদি dot না থাকে, direct field sorting
      // উদাহরণ: sortBy=name => { name: 'asc' }
      this.query.orderBy = {
        [sortBy]: sortOrder,
      };
    }
    return this;
  }

  /**
   * fields() - নির্দিষ্ট fields select করার জন্য (বাকি fields বাদ যাবে)
   *
   * উদাহরণ: /doctors?fields=id,name,email
   * এটি শুধু id, name, email fields return করবে, বাকি fields আসবে না
   *
   * সুবিধা: response size কমে, শুধু প্রয়োজনীয় data পাওয়া যায়
   *
   * নোট: এটি ব্যবহার করলে include() কাজ করবে না
   */
  fields(): this {
    // URL থেকে fields parameter নেওয়া
    const fieldsParam = this.queryParams.fields;
    // উদাহরণ: /doctors?fields=id,name,email
    // ফলাফল: select: { id: true, name: true, email: true }

    // বর্তমানে শুধু direct fields support করে, nested field selection করে না
    if (fieldsParam && typeof fieldsParam === "string") {
      // comma দিয়ে split করে array তৈরি করা এবং spaces remove করা
      // "id, name, email" => ["id", "name", "email"]
      const fieldsArray = fieldsParam?.split(",").map((field) => field.trim());
      this.selectFields = {};

      // প্রতিটি field কে true করে দেওয়া (মানে এই field select করতে চাই)
      fieldsArray?.forEach((field) => {
        if (this.selectFields) {
          this.selectFields[field] = true;
        }
      });
      // ফলাফল: { id: true, name: true, email: true }

      // Prisma query তে select set করা
      this.query.select = this.selectFields as Record<
        string,
        boolean | Record<string, unknown>
      >;

      // Prisma তে select এবং include একসাথে কাজ করে না
      // তাই include delete করে দেওয়া
      delete this.query.include;
    }
    return this;
  }

  /**
   * include() - Related data include করার জন্য
   *
   * উদাহরণ: queryBuilder.include({ user: true, specialties: true })
   * এটি doctor এর সাথে user এবং specialties data ও return করবে
   *
   * নোট: যদি fields() method ব্যবহার করা হয়, include কাজ করবে না
   */
  include(relation: TInclude): this {
    // যদি selectFields set করা আেছ (মানে fields() method call করা হয়েছে)
    // তাহলে include করা যাবে না, কারণ Prisma select এবং include একসাথে support করে না
    if (this.selectFields) {
      return this;
    }

    // আগের include data এর সাথে নতুন relation merge করা
    this.query.include = {
      ...(this.query.include as Record<string, unknown>),
      ...(relation as Record<string, unknown>),
    };

    return this;
  }

  /**
   * dynamicInclude() - URL parameter অনুযায়ী dynamically relations include করা
   *
   * উদাহরণ: /doctors?include=user,specialties
   * এটি user এবং specialties relations include করবে
   *
   * @param includeConfig - কোন relations available আছে এবং তাদের configuration
   * @param defaultInclude - default ভাবে কোন relations include করতে হবে
   */
  dynamicInclude(
    includeConfig: Record<string, unknown>,
    defaultInclude?: string[],
  ): this {
    // যদি fields() method ব্যবহার করা হয়েছে, include করা যাবে না
    if (this.selectFields) {
      return this;
    }

    // ফলাফল object তৈরি করা
    const result: Record<string, unknown> = {};

    // প্রথমে default relations add করা
    defaultInclude?.forEach((field) => {
      if (includeConfig[field]) {
        result[field] = includeConfig[field];
      }
    });

    // URL থেকে include parameter নেওয়া
    const includeParam = this.queryParams.include as string | undefined;

    // যদি include parameter থাকে
    if (includeParam && typeof includeParam === "string") {
      // comma দিয়ে split করে relation names array তৈরি করা
      // "user,specialties" => ["user", "specialties"]
      const requestedRelations = includeParam
        .split(",")
        .map((relation) => relation.trim());

      // প্রতিটি requested relation check করে result এ add করা
      requestedRelations.forEach((relation) => {
        // যদি এই relation config এ available আছে
        if (includeConfig[relation]) {
          result[relation] = includeConfig[relation];
        }
      });
    }

    // আগের include data এর সাথে merge করে query এ set করা
    this.query.include = {
      ...(this.query.include as Record<string, unknown>),
      ...result,
    };

    return this;
  }

  /**
   * where() - Custom where conditions manually add করার জন্য
   *
   * উদাহরণ: queryBuilder.where({ isActive: true, isDeleted: false })
   * এটি শুধু active এবং non-deleted records return করবে
   *
   * filter() method এর সাথে merge হয়ে কাজ করে
   */
  where(condition: TWhereInput): this {
    // আগের where conditions এর সাথে নতুন condition deep merge করা
    this.query.where = this.deepMerge(
      this.query.where as Record<string, unknown>,
      condition as Record<string, unknown>,
    );

    // count query তেও same condition add করা
    this.countQuery.where = this.deepMerge(
      this.countQuery.where as Record<string, unknown>,
      condition as Record<string, unknown>,
    );

    return this;
  }

  /**
   * execute() - সবশেষে query database এ execute করে result return করা
   *
   * একই সময় 2টি কাজ করে:
   * 1. Total records count করা (পূর্ণ dataset এ)
   * 2. Current page এর data fetch করা (পার্টিয়াল dataset)
   *
   * Return করে:
   * - data: বর্তমান page এর records
   * - meta: pagination information (page, limit, total, totalPages)
   */
  async execute(): Promise<IQueryResult<T>> {
    // Promise.all দিয়ে 2টি query একসাথে parallel এ run করানো
    // এতে time save হয়, একটার জন্য অন্যটা wait করতে হয় না
    const [total, data] = await Promise.all([
      // 1. Total records count করা (countQuery ব্যবহার করে)
      this.model.count(
        this.countQuery as Parameters<typeof this.model.count>[0],
      ),
      // 2. Actual data fetch করা (query ব্যবহার করে)
      this.model.findMany(
        this.query as Parameters<typeof this.model.findMany>[0],
      ),
    ]);

    // Total pages calculate করা
    // উদাহরণ: total=25, limit=10 => totalPages = Math.ceil(25/10) = 3
    const totalPages = Math.ceil(total / this.limit);

    // Data এবং meta information return করা
    return {
      data: data as T[], // বর্তমান page এর records array
      meta: {
        page: this.page, // বর্তমান page number
        limit: this.limit, // প্রতি page এ records limit
        total, // মোট records সংখ্যা
        totalPages, // মোট pages সংখ্যা
      },
    };
  }

  /**
   * count() - শুধু total records count return করা, data না
   *
   * উদাহরণ: যখন শুধু কতগুলো doctor আছে জানতে চাই
   */
  async count(): Promise<number> {
    // countQuery execute করে number return করা
    return await this.model.count(
      this.countQuery as Parameters<typeof this.model.count>[0],
    );
  }

  /**
   * getQuery() - বিল্ট করা query object return করা (debugging এর জন্য useful)
   *
   * কখন লাগতে পারে: query structure check করতে বা manually execute করতে
   */
  getQuery(): PrismaFindManyArgs {
    return this.query;
  }

  /**
   * deepMerge() - 2টি object গভীরভাবে merge করা (nested objects ও merge হয়)
   *
   * কেন প্রয়োজন:
   * Normal spread operator (...) শুধু top-level merge করে
   * কিন্তু nested objects ঠিকমতো merge করতে deepMerge প্রয়োজন
   *
   * উদাহরণ:
   * target = { user: { name: 'John' } }
   * source = { user: { email: 'john@example.com' } }
   * ফলাফল = { user: { name: 'John', email: 'john@example.com' } }
   *
   * @param target - প্রথম object (যার সাথে merge করতে হবে)
   * @param source - দ্বিতীয় object (যা মার্জ করতে হবে)
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    // প্রথমে target এর copy তৈরি করা (original modify না করার জন্য)
    const result = { ...target };

    // source object ঎র প্রতিটি key process করা
    for (const key in source) {
      // যদি source[key] একটি object হয় (array না)
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        // এবং target[key] ও object হয়
        if (
          result[key] &&
          typeof result[key] === "object" &&
          !Array.isArray(result[key])
        ) {
          // তাহলে recursively (deep) merge করতে হবে
          result[key] = this.deepMerge(
            result[key] as Record<string, unknown>,
            source[key] as Record<string, unknown>,
          );
        } else {
          // নাহলে সিধা source[key] set করে দেওয়া
          result[key] = source[key];
        }
      } else {
        // যদি object না হয় (সাধারণ value/array), সিধা set করে দেওয়া
        result[key] = source[key];
      }
    }
    return result;
  }

  /**
   * parseFilterValue() - Filter value কে সঠিক type এ convert করা
   *
   * URL query parameters সবসময় string আকারে আসে
   * এই method সেগুলোকে proper type এ convert করে:
   * - "true" => true (boolean)
   * - "false" => false (boolean)
   * - "123" => 123 (number)
   * - ["1", "2"] => { in: [1, 2] } (array filter)
   *
   * @param value - যে value convert করতে হবে
   */
  private parseFilterValue(value: unknown): unknown {
    // String "true" কে boolean true এ convert করা
    if (value === "true") {
      return true;
    }
    // String "false" কে boolean false এ convert করা
    if (value === "false") {
      return false;
    }

    // যদি string এবং সেটি number হতে পারে (এবং empty না)
    // তাহলে number এ convert করা
    // উদাহরণ: "100" => 100
    if (typeof value === "string" && !isNaN(Number(value)) && value != "") {
      return Number(value);
    }

    // যদি array হয়
    // Prisma এর 'in' operator ব্যবহার করে query structure তৈরি করা
    // উদাহরণ: ["1", "2", "3"] => { in: [1, 2, 3] }
    // মানে: id এই array এর যেকোনো একটি হতে হবে
    if (Array.isArray(value)) {
      return { in: value.map((item) => this.parseFilterValue(item)) };
    }

    // অন্য সব কিছু যেমন আছে তেমন return করা
    return value;
  }

  /**
   * parseRangeFilter() - Range/comparison filter parse করা
   *
   * URL এ range filter এইভাবে আসে:
   * ?appointmentFee[lt]=100&appointmentFee[gt]=50
   *
   * এটি parse করে Prisma query format এ convert করে:
   * { appointmentFee: { lt: 100, gt: 50 } }
   *
   * Supported operators:
   * - lt: less than (কম)
   * - lte: less than or equal (কম বা সমান)
   * - gt: greater than (বেশি)
   * - gte: greater than or equal (বেশি বা সমান)
   * - equals: সমান
   * - not: সমান না
   * - contains: ধারণ করে (string এর জন্য)
   * - startsWith: আরম্ভ হয় (string এর জন্য)
   * - endsWith: শেষ হয় (string এর জন্য)
   * - in: array এর যেকোনো একটি
   * - notIn: array এর কোনটি না
   *
   * @param value - range filter object
   */
  private parseRangeFilter(
    value: Record<string, string | number>,
  ): PrismaNumberFilter | PrismaStringFilter | Record<string, unknown> {
    // ফলাফল query object
    const rangeQuery: Record<string, string | number | (string | number)[]> =
      {};

    // প্রতিটি operator process করা
    Object.keys(value).forEach((operator) => {
      const operatorValue = value[operator];

      // যদি value undefined হয় তাহলে skip করা
      if (operatorValue === undefined) return;

      // যদি string number হয় তাহলে Number এ convert করা
      // উদাহরণ: "100" => 100
      const parsedValue: string | number =
        typeof operatorValue === "string" && !isNaN(Number(operatorValue))
          ? Number(operatorValue)
          : operatorValue;

      // operator অনুযায়ী rangeQuery তে add করা
      switch (operator) {
        case "lt": // less than
        case "lte": // less than or equal
        case "gt": // greater than
        case "gte": // greater than or equal
        case "equals": // equals
        case "not": // not equals
        case "contains": // contains (string)
        case "startsWith": // starts with (string)
        case "endsWith": // ends with (string)
          rangeQuery[operator] = parsedValue;
          break;

        case "in": // in array
        case "notIn": // not in array
          // যদি already array হয় তাহলে সিধা set করা
          if (Array.isArray(operatorValue)) {
            rangeQuery[operator] = operatorValue;
          } else {
            // নাহলে array আকারে convert করা
            rangeQuery[operator] = [parsedValue];
          }
          break;
        default:
          // Unknown operator হলে skip করা
          break;
      }
    });

    // যদি কোনো valid operator পাওয়া গেছে তাহলে rangeQuery return করা
    // নাহলে original value return করা
    return Object.keys(rangeQuery).length > 0 ? rangeQuery : value;
  }
}
