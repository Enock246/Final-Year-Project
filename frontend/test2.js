const prompt = `Write a professional application letter for a university student. Student Name: Kwame`;

fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`)
.then(async res => {
  console.log("Status:", res.status);
  console.log("Text:", await res.text());
})
.catch(err => console.error(err));
