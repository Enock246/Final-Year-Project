const data = {
  studentProfile: { full_name: "Kwame", key_skills_and_offerings: ["Math"] },
  schoolDetails: { name: "Accra Academy", town_city: "Accra" }
};

fetch('http://localhost:3000/api/generate-application', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
