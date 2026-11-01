const bcrypt=require("bcryptjs");
const readline=require("node:readline");
async function run(){
  const input=readline.createInterface({input:process.stdin,output:process.stdout,terminal:false});
  let line;
  for await(const item of input){line=item;break;}
  input.close();
  if(!line||line.length<14)throw new Error("Password must be at least 14 characters; pipe it securely through stdin");
  console.log("ADMIN_PASSWORD_HASH="+await bcrypt.hash(line,12));
}
run().catch(e=>{console.error(e.message);process.exitCode=1});
