
"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserData, Location } from "@/types";
import { Loader2, Search, SlidersHorizontal, GraduationCap, Phone, MapPin, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import Image from "next/image";
import { locations } from "@/lib/locations";
import { Separator } from "@/components/ui/separator";

const olSubjects = [
    "Mother language (Sinhala or Tamil)", "Buddhism", "Catholicism", "Christianity",
    "Islam", "Hinduism", "English", "Mathematics", "Science", "History",
    "Business & Accounting Studies", "Geography", "Civic Education",
    "Entrepreneurship Studies", "Second Language - Sinhala (For students whose dominant language is Tamil)",
    "Second Language - Tamil (For students whose dominant language is Sinhala)", "Pali Language",
    "Sanskrit Language", "French Language", "German Language", "Hindi Language",
    "Japanese Language", "Arabic Language", "Korean Language", "Chinese Language",
    "Russian Language", "Eastern Music", "Western Music", "Carnatic Music",
    "Eastern Dancing", "Bharatha Dancing", "Art", "Appreciation of English Literary Texts (English Literature)",
    "Appreciation of Sinhala Literary Texts (Sinhala Literature)", "Appreciation of Tamil Literary Texts (Tamil Literature)",
    "Appreciation of Arabic Literary Texts (Arabic Literature)", "Drama and Theatre",
    "Information & Communication Technology", "Agriculture & Food Technology", "Aquatic Bio resources Technology",
    "Arts & Crafts", "Home Economics", "Health & Physical Education", "Communication & Media Studies",
    "Design & Construction Technology", "Design & Mechanical Technology", "Design, Electrical & Electronic Technology",
    "Electronic Writing & Shorthand"
];

const alSubjects = [
    // Science & Technology
    "Combined Mathematics", "Physics", "Chemistry", "Biology", "Agricultural Science",
    "ICT (Information and Communication Technology)", "Engineering Technology", "Science for Technology", "Bio-system Technology",
    // Commerce & Business
    "Business Studies", "Accounting", "Economics", "Business Statistics",
    // Religion & Civilizations
    "Buddhism", "Hinduism", "Islam", "Christianity", "Buddhist Civilization",
    "Hindu Civilization", "Islam Civilization", "Christian Civilization", "Greek and Roman Civilization",
    // Languages
    "Sinhala", "Tamil", "English", "Pali", "Sanskrit", "Arabic", "Hindi",
    "Japanese", "Chinese", "Korean", "Malay", "French", "German", "Russian",
    // Humanities & Social Sciences
    "Political Science", "History (Sri Lankan, Indian, European, or of the Modern World)",
    "Geography", "Logic and Scientific Method", "Mass Media and Communication Studies",
    // Aesthetics & Applied Arts
    "Aesthetic Subjects (Dancing, Music [Western or Eastern], Drama, Arts)", "Home Science"
];
const grades = Array.from({ length: 13 }, (_, i) => i + 1);

function FindTeacherComponent() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [teachers, setTeachers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [nameFilter, setNameFilter] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  
  const cleanPhoneNumber = (num: string = '') => num.replace(/\D/g, '');

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== 'seeker')) {
      router.push("/dashboard");
    } else if (!authLoading) {
      const fetchData = async () => {
        setLoading(true);
        const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"), where("status", "==", "active"));
        const querySnapshot = await getDocs(teachersQuery);
        const teachersData = querySnapshot.docs.map(doc => doc.data() as UserData);
        setTeachers(teachersData);
        setLoading(false);
      };
      fetchData();
    }
  }, [user?.uid, authLoading, router]);
  
  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      const nameMatch = teacher.name.toLowerCase().includes(nameFilter.toLowerCase());
      
      const subjectMatch = selectedSubjects.length === 0 || selectedSubjects.some(s => teacher.subjects?.includes(s));
      const gradeMatch = selectedGrades.length === 0 || selectedGrades.some(g => teacher.grades?.includes(g));

      const locationMatch = 
        (selectedProvinces.length === 0 && selectedDistricts.length === 0 && selectedCities.length === 0) ||
        teacher.locations?.some(loc => 
          (selectedProvinces.length === 0 || selectedProvinces.includes(loc.province)) &&
          (selectedDistricts.length === 0 || selectedDistricts.includes(loc.district)) &&
          (selectedCities.length === 0 || selectedCities.includes(loc.city))
        );

      return nameMatch && subjectMatch && gradeMatch && locationMatch;
    });
  }, [teachers, nameFilter, selectedSubjects, selectedGrades, selectedProvinces, selectedDistricts, selectedCities]);
  
  const availableDistricts = useMemo(() => {
    if (selectedProvinces.length === 0) return Object.keys(locations.cities);
    return selectedProvinces.flatMap(p => locations.districts[p as keyof typeof locations.districts]);
  }, [selectedProvinces]);

  const availableCities = useMemo(() => {
    if (selectedDistricts.length === 0) {
      if(selectedProvinces.length === 0) return Object.values(locations.cities).flat();
      return availableDistricts.flatMap(d => locations.cities[d as keyof typeof locations.cities]);
    }
    return selectedDistricts.flatMap(d => locations.cities[d as keyof typeof locations.cities]);
  }, [selectedProvinces, selectedDistricts, availableDistricts]);


  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Find a Teacher</h1>
        <p className="text-muted-foreground max-w-lg">Browse our talented teachers and tutors. Use the filters to find the perfect match for your learning needs.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5" /> Filter Teachers</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input 
            placeholder="Search by name..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
         
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline">Subjects ({selectedSubjects.length})</Button></DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 max-h-80 overflow-y-auto">
              <DropdownMenuLabel>O/L Subjects</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {olSubjects.map(subject => (
                <DropdownMenuCheckboxItem key={subject} checked={selectedSubjects.includes(subject)} onCheckedChange={() => {
                  setSelectedSubjects(prev => prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]);
                }}>{subject}</DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>A/L Subjects</DropdownMenuLabel>
              <DropdownMenuSeparator />
               {alSubjects.map(subject => (
                <DropdownMenuCheckboxItem key={subject} checked={selectedSubjects.includes(subject)} onCheckedChange={() => {
                  setSelectedSubjects(prev => prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]);
                }}>{subject}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

           <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline">Grades ({selectedGrades.length})</Button></DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 max-h-80 overflow-y-auto">
              <DropdownMenuLabel>Filter by Grade</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {grades.map(grade => (
                <DropdownMenuCheckboxItem key={grade} checked={selectedGrades.includes(grade)} onCheckedChange={() => {
                  setSelectedGrades(prev => prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]);
                }}>Grade {grade}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline">Location</Button></DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 max-h-96 overflow-y-auto">
                <DropdownMenuLabel>Filter by Province</DropdownMenuLabel>
                <DropdownMenuSeparator />
                 {locations.provinces.map(province => (
                    <DropdownMenuCheckboxItem key={province} checked={selectedProvinces.includes(province)} onCheckedChange={() => setSelectedProvinces(p => p.includes(province) ? p.filter(i => i !== province) : [...p, province])}>{province}</DropdownMenuCheckboxItem>
                 ))}
                 <DropdownMenuSeparator />
                <DropdownMenuLabel>Filter by District</DropdownMenuLabel>
                <DropdownMenuSeparator />
                 {availableDistricts.map(district => (
                    <DropdownMenuCheckboxItem key={district} checked={selectedDistricts.includes(district)} onCheckedChange={() => setSelectedDistricts(d => d.includes(district) ? d.filter(i => i !== district) : [...d, district])}>{district}</DropdownMenuCheckboxItem>
                 ))}
                 <DropdownMenuSeparator />
                <DropdownMenuLabel>Filter by City</DropdownMenuLabel>
                <DropdownMenuSeparator />
                 {availableCities.map(city => (
                    <DropdownMenuCheckboxItem key={city} checked={selectedCities.includes(city)} onCheckedChange={() => setSelectedCities(c => c.includes(city) ? c.filter(i => i !== city) : [...c, city])}>{city}</DropdownMenuCheckboxItem>
                 ))}
              </DropdownMenuContent>
            </DropdownMenu>

        </CardContent>
      </Card>
      
      <div className="space-y-6">
        {filteredTeachers.length > 0 ? (
          filteredTeachers.map(teacher => (
            <Card key={teacher.uid} className="w-full">
              <CardContent className="p-6 flex flex-col sm:flex-row gap-6">
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                  <Avatar className="h-24 w-24 border-2 border-primary mb-4">
                      <AvatarImage src={teacher.photoURL} alt={teacher.name} />
                      <AvatarFallback className="text-3xl">{teacher.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-semibold">{teacher.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mt-2 sm:max-w-xs">{teacher.aboutMe}</p>
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><BookOpen className="h-4 w-4"/> Subjects</h4>
                    <div className="flex flex-wrap gap-2">
                        {teacher.subjects && teacher.subjects.length > 0 ? (
                            teacher.subjects.slice(0, 5).map(s => <Badge key={s} variant="secondary">{s}</Badge>)
                        ) : <p className="text-xs text-muted-foreground">No subjects listed.</p>}
                        {teacher.subjects && teacher.subjects.length > 5 && <Badge variant="outline">+{teacher.subjects.length - 5} more</Badge>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><GraduationCap className="h-4 w-4"/>Grades</h4>
                      <div className="flex flex-wrap gap-2">
                        {teacher.grades && teacher.grades.length > 0 ? (
                              teacher.grades.sort((a,b) => a-b).slice(0,3).map(g => <Badge key={g} variant="outline">Grade {g}</Badge>)
                          ) : <p className="text-xs text-muted-foreground">No grades listed.</p>}
                           {teacher.grades && teacher.grades.length > 3 && <Badge variant="outline">+{teacher.grades.length - 3} more</Badge>}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><MapPin className="h-4 w-4"/>Locations</h4>
                      <div className="flex flex-wrap gap-2">
                        {teacher.locations && teacher.locations.length > 0 ? (
                              teacher.locations.slice(0,2).map((loc, i) => (
                                  <Badge key={i} variant="outline">{loc.city}</Badge>
                              ))
                          ) : <p className="text-xs text-muted-foreground">No locations listed.</p>}
                           {teacher.locations && teacher.locations.length > 2 && <Badge variant="outline">+{teacher.locations.length - 2} more</Badge>}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator orientation="vertical" className="hidden sm:block h-auto mx-4"/>

                <div className="flex flex-col items-center justify-center gap-2 w-full sm:w-48">
                    <Button asChild className="w-full">
                      <Link href={`/teacher/${teacher.uid}`}>View Profile</Link>
                    </Button>
                    <a href={`https://wa.me/${cleanPhoneNumber(teacher.whatsApp)}`} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button variant="outline" className="w-full"><WhatsAppIcon /> Chat</Button>
                    </a>
                    <a href={`tel:${cleanPhoneNumber(teacher.phone)}`} className="w-full">
                        <Button variant="outline" className="w-full"><Phone/> Call Now</Button>
                    </a>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-muted-foreground col-span-full text-center py-8">No teachers match your criteria.</p>
        )}
      </div>
    </div>
  );
}

export default function FindTeacherPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <FindTeacherComponent />
        </Suspense>
    )
}
