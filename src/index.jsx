/*** SCHEMA ***/
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
} from "graphql";

const PersonType = new GraphQLObjectType({
  name: "Person",
  fields: {
    id: { type: GraphQLID },
    age: { type: GraphQLInt },
  },
});

const personData = { id: 1, age: 0, __typename: 'Person' };

const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    person: {
      type: PersonType,
      resolve: () => personData,
    },
  },
});

const MutationType = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    person: {
      type: PersonType,
      args: {
        age: { type: GraphQLInt },
      },
      resolve: function (_, { age }) {
        personData.age = age;
        return personData;
      },
    },
  },
});

const schema = new GraphQLSchema({ query: QueryType, mutation: MutationType });

/*** LINK ***/
import { graphql, print } from "graphql";
import { ApolloLink, Observable, from } from "@apollo/client";
function delay(wait) {
  return new Promise((resolve) => setTimeout(resolve, wait));
}

const terminatingLink = new ApolloLink((operation) => {
  return new Observable(async (observer) => {
    const { query, operationName, variables } = operation;
    await delay(500);
    try {
      const result = await graphql({
        schema,
        source: print(query),
        variableValues: variables,
        operationName,
      });
      observer.next(result);
      observer.complete();
    } catch (err) {
      observer.error(err);
    }
  });
});

const CACHE_QUERY = gql`
  query Person {
    person {
      id
      clientAge @client
    }
  }
`;

// Increment the clientAge local field in a link
const cacheUpdateLink = new ApolloLink((operation, forward) => {
  if (operation.operationName === 'SetAge') {
    const data = cache.read({
      query: CACHE_QUERY
    });

    cache.writeQuery({
      query: CACHE_QUERY,
      data: {
        person: {
          ...data.person,
          clientAge: data.person.clientAge + 1
        }
      }
    });

    cache.modify({
      
    })
  }
  return forward(operation);
});

const link = from([cacheUpdateLink, terminatingLink]);

const cache = new InMemoryCache({
  typePolicies: {
    Person: {
      fields: {
        clientAge: {
          read(clientAge = 0, ...args) {
            return clientAge;
          },
        },
      },
    },
  },
})

/*** APP ***/
import React from "react";
import { createRoot } from "react-dom/client";
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  gql,
  useQuery,
  useMutation,
} from "@apollo/client";
import "./index.css";

const PERSON = gql`
  query Person {
    person {
      id
      age
      clientAge @client
    }
  }
`;

const SET_AGE = gql`
  mutation SetAge($age: Int) {
    person(age: $age) {
      id
      age
    }
  }
`;

function App() {
  const { loading, data } = useQuery(PERSON);

  const [setAge] = useMutation(SET_AGE);

  return (
    <main>
      <h1>Apollo Client Issue Reproduction</h1>

      <p>
        Clicking Increment will optimistically add one to the age, and in a link will add one to the client age.
      </p>

      <h2>Expected</h2>
      <p>
        Each click will simultaneously increment age and clientAge.
      </p>

      <h2>Actual</h2>
      <p>
        The first click (which adds clientAge to the cached object) works correctly.
        All future updates only rerender once the network request finishes.
      </p>

      <div className="add-person">
        <button
          onClick={() => {
            setAge({ variables: { age: data.person.age + 1 }, optimisticResponse: {
              person: {
                __typename: "Person",
                id: data.person.id,
                age: data.person.age + 1,
              },
            } });
          }}
        >
          Increment Age
        </button>
      </div>

      <h2>Ages</h2>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul>
          <li>Age: {data.person.age}</li>
          <li>Client Age: {data.person.clientAge}</li>
        </ul>
      )}
    </main>
  );
};

const client = new ApolloClient({
  cache,
  link,
});

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
);
