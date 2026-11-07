import { useState } from "react";
import { useLocation } from "wouter";
import { Search, MapPin, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface SearchBarProps {
  onSearch?: (searchParams: { query: string, location: string, service: string }) => void;
  placeholder?: string;
  compact?: boolean;
  simpleNavbar?: boolean;
}

const SearchBar = ({ 
  onSearch, 
  placeholder = "Search for designers, styles, or locations...",
  compact = false,
  simpleNavbar = false
}: SearchBarProps) => {
  const [_, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedService, setSelectedService] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build search URL with parameters
    const searchParams = new URLSearchParams();
    if (searchTerm) searchParams.append("query", searchTerm);
    
    // Only add location if it's not the "any" option
    if (selectedLocation && selectedLocation !== "any-location") {
      searchParams.append("location", selectedLocation);
    }
    
    // Only add service if it's not the "any" option
    if (selectedService && selectedService !== "any-service") {
      searchParams.append("service", selectedService);
    }
    
    // Get clean location and service values for the callback
    const cleanLocation = selectedLocation === "any-location" ? "" : selectedLocation;
    const cleanService = selectedService === "any-service" ? "" : selectedService;
    
    // Navigate to search results page with query parameters
    const searchUrl = `/search?${searchParams.toString()}`;
    
    if (onSearch) {
      onSearch({
        query: searchTerm,
        location: cleanLocation,
        service: cleanService
      });
    } else {
      setLocation(searchUrl);
    }
  };

  const locations = [
    "New York",
    "Los Angeles",
    "Chicago",
    "Miami",
    "San Francisco",
    "Seattle",
    "Boston",
    "Austin",
    "Remote Only"
  ];

  const services = [
    "Interior Design",
    "Custom Furniture",
    "Kitchen Design",
    "Bathroom Design",
    "Space Planning",
    "Color Consultation",
    "Lighting Design",
    "Home Staging",
    "Commercial Design"
  ];

  // Simple navbar search - only search term, no location or service filters
  if (simpleNavbar) {
    return (
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 rounded-full border-line"
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </form>
    );
  }

  // Compact search for mobile
  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative w-full">
          <Input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 rounded-full py-1.5"
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location selector */}
            <div className="relative">
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Location" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any-location">Any Location</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Service selector */}
            <div className="relative">
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center">
                    <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Service" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any-service">Any Service</SelectItem>
                  {services.map(service => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button type="submit" className="w-full">
            Search Designers
          </Button>
        </div>
      </div>
    </form>
  );
};

export default SearchBar;