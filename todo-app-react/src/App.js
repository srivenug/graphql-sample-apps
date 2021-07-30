import React from 'react'
import { Router, Switch } from "react-router-dom";

import ApolloClient from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloProvider } from "@apollo/react-hooks";
import { createHttpLink } from "apollo-link-http";
import { useAuth0 } from "./react-auth0-spa";
import { setContext } from "apollo-link-context";
//added for logging errors
import { from } from "@apollo/client";
import { onError } from "@apollo/client/link/error";
//subscription import
import { WebSocketLink } from "@apollo/link-ws";
import { split } from "@apollo/client";
import { getMainDefinition } from "@apollo/client/utilities";

import TodoApp from './TodoApp';
import NavBar from "./NavBar";
import Profile from "./Profile";
import history from "./history";
import PrivateRoute from "./PrivateRoute";
import config from "./config.json";
import './App.css';


const createApolloClient = token => {
  const httpLink = createHttpLink({
    // update graphqlUrl
    uri: config.graphqlUrl,
    credentials: 'same-origin',
    options: {
      reconnect: true,
    },
  });

//subscription sample app begin
const wsLink = process.browser
? new WebSocketLink({
    uri: `ws://localhost:8080/graphql`,
    options: {
      reconnect: true,
    },
  })
: null;

const splitLink = process.browser
? split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === "OperationDefinition" &&
        definition.operation === "subscription"
      );
    },
    wsLink,
    httpLink
  )
: httpLink;
// subscription sample app end

  console.log ("token", token)
  const authLink = setContext((_, { headers }) => {
    // return the headers to the context so httpLink can read them
    return {
      headers: {
        ...headers,
        // added for authorization token
        "X-Auth-Token": token,
      },
    };
  });

  // modified to print network errors
  const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors)
      graphQLErrors.forEach(({ message, locations, path }) =>
        console.log(
          `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
        ),
      );
    if (networkError) console.log(`[Network error]: ${networkError}`);
  });

  let client11 =  new ApolloClient({
    link: authLink.concat(httpLink),
    //link: from([errorLink, authLink.concat(httpLink)]),
    //link: splitLink,
    cache: new InMemoryCache()
  });

  // added console log to print Apollo Client
  console.log("Apollo client", client11)
  return client11
}

const App = ({idToken}) => {
  const { loading } = useAuth0();
  if (loading) {
    return <div>Loading...</div>;
  }
  const client = createApolloClient(idToken);
  return (
    <ApolloProvider client={client}>
      <div>
        <Router history={history}>
          <h1>todos</h1>
          <header className="navheader">
            <NavBar />
          </header>
          <Switch>
            <PrivateRoute path="/" component={TodoApp} exact />
            <PrivateRoute path="/profile" component={Profile} />
          </Switch>
        </Router>
    </div>
    </ApolloProvider>
  );
}

export default App
