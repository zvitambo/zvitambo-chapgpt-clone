import Head from "next/head";
import Link from "next/link"
import {useUser} from "@auth0/nextjs-auth0/client";
import { getSession } from "@auth0/nextjs-auth0";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot } from "@fortawesome/free-solid-svg-icons";

export default function Home() {

  const {isLoading, error, user} = useUser();

  if (isLoading) return <div>...Loading </div>
   if (error) return <div>{error.message} </div>;
  return (
    <div>
      <Head>
        <title>ChattyZvitambo Login or SignUp </title>
      </Head>
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-800 text-center text-center text-white">
        <div>
          <div>
            {" "}
            <FontAwesomeIcon
              icon={faRobot}
              className="mb-2 text-6xl text-emerald-200"
            />
          </div>
          <h1 className="text-4xl font-bold">Welcome to Chatty Zvitambo</h1>
          <p className="mt-2 text-lg">Login with your account to continue</p>
          <div className="mt-4 flex justify-center gap-3">
            {/* {!!user && <Link href="/api/auth/logout">Logout</Link>} */}
            {!user && (
              <>
                <Link
                  href="/api/auth/login"
                  className="rounded-md bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600"
                >
                  Login
                </Link>
                <Link
                  href="/api/auth/signup"
                  className="rounded-md bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600"
                >
                  SignUp
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = async (context) => {
  const session = await getSession(context.req, context.res);
  
  if (!!session){
    return {redirect: {
      destination: "/chat"
    }}
  }
  return {
    props: {},
  };
}