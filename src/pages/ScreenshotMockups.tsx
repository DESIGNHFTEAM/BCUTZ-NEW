import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Camera, 
  Star, 
  MapPin, 
  Calendar, 
  Gift,
  Scissors,
  Clock,
  Heart
} from 'lucide-react';

// Screenshot specifications for app stores
const SCREENSHOT_SPECS = {
  ios: [
    { name: 'iPhone 6.7"', width: 1290, height: 2796, required: true },
    { name: 'iPhone 6.5"', width: 1242, height: 2688, required: true },
    { name: 'iPhone 5.5"', width: 1242, height: 2208, required: false },
    { name: 'iPad 12.9"', width: 2048, height: 2732, required: false },
  ],
  android: [
    { name: 'Phone', width: 1080, height: 1920, required: true },
    { name: '7" Tablet', width: 1200, height: 1920, required: false },
    { name: '10" Tablet', width: 1600, height: 2560, required: false },
  ],
};

// Mock data for screenshots
const MOCK_BARBERS = [
  { name: 'Elite Cuts', rating: 4.9, reviews: 127, location: 'Zürich', image: '/placeholder.svg' },
  { name: 'Urban Style', rating: 4.8, reviews: 89, location: 'Basel', image: '/placeholder.svg' },
  { name: 'Classic Barber', rating: 4.7, reviews: 156, location: 'Bern', image: '/placeholder.svg' },
];

const MOCK_SERVICES = [
  { name: 'Haircut', price: 35, duration: 30 },
  { name: 'Beard Trim', price: 20, duration: 15 },
  { name: 'Full Package', price: 50, duration: 45 },
];

// Screenshot mockup components
function HeroScreenshot() {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-background to-muted overflow-hidden">
      <div className="absolute inset-0 bg-[url('/placeholder.svg')] bg-cover bg-center opacity-20" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="mb-6">
          <Scissors className="w-16 h-16 text-primary mx-auto" />
        </div>
        <h1 className="text-4xl font-bold mb-4 text-foreground">BCUTZ</h1>
        <p className="text-xl text-muted-foreground mb-8">Find your perfect barber</p>
        <Button size="lg" className="bg-primary text-primary-foreground">
          Get Started
        </Button>
      </div>
    </div>
  );
}

function DiscoveryScreenshot() {
  return (
    <div className="w-full h-full bg-background p-4 overflow-hidden">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground mb-2">Nearby Barbers</h2>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>Zürich, Switzerland</span>
        </div>
      </div>
      <div className="space-y-4">
        {MOCK_BARBERS.map((barber, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="flex">
              <div className="w-24 h-24 bg-muted flex items-center justify-center">
                <Scissors className="w-8 h-8 text-muted-foreground" />
              </div>
              <CardContent className="flex-1 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{barber.name}</h3>
                    <p className="text-sm text-muted-foreground">{barber.location}</p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Heart className="w-5 h-5" />
                  </Button>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  <span className="font-medium">{barber.rating}</span>
                  <span className="text-muted-foreground text-sm">({barber.reviews})</span>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BookingScreenshot() {
  return (
    <div className="w-full h-full bg-background p-4 overflow-hidden">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-1">Book Appointment</h2>
        <p className="text-muted-foreground">Elite Cuts • Zürich</p>
      </div>
      
      <div className="mb-6">
        <h3 className="font-semibold text-foreground mb-3">Select Service</h3>
        <div className="space-y-2">
          {MOCK_SERVICES.map((service, i) => (
            <Card key={i} className={i === 0 ? 'border-primary' : ''}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{service.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{service.duration} min</span>
                  </div>
                </div>
                <p className="font-semibold text-foreground">CHF {service.price}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold text-foreground mb-3">Select Date</h3>
        <div className="grid grid-cols-7 gap-1">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
            <div key={day} className="text-center text-sm text-muted-foreground py-2">
              {day}
            </div>
          ))}
          {Array.from({ length: 14 }, (_, i) => (
            <div
              key={i}
              className={`text-center py-2 rounded-md ${
                i === 5 ? 'bg-primary text-primary-foreground' : 'text-foreground'
              }`}
            >
              {i + 10}
            </div>
          ))}
        </div>
      </div>

      <Button className="w-full" size="lg">
        Continue
      </Button>
    </div>
  );
}

function LoyaltyScreenshot() {
  return (
    <div className="w-full h-full bg-background p-4 overflow-hidden">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-1">Loyalty Rewards</h2>
        <p className="text-muted-foreground">Earn points with every booking</p>
      </div>

      <Card className="mb-6 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
        <CardContent className="p-6 text-center">
          <Gift className="w-12 h-12 text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">Your Points</p>
          <p className="text-4xl font-bold text-foreground">1,250</p>
          <Badge className="mt-3 bg-primary/20 text-primary border-0">Gold Member</Badge>
        </CardContent>
      </Card>

      <h3 className="font-semibold text-foreground mb-3">Available Rewards</h3>
      <div className="space-y-3">
        {[
          { name: '10% Off Next Booking', points: 500 },
          { name: 'Free Beard Trim', points: 800 },
          { name: 'Free Premium Haircut', points: 1500 },
        ].map((reward, i) => (
          <Card key={i}>
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{reward.name}</p>
                <p className="text-sm text-muted-foreground">{reward.points} points</p>
              </div>
              <Button size="sm" variant={i === 0 ? 'default' : 'outline'}>
                Redeem
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BookingsListScreenshot() {
  return (
    <div className="w-full h-full bg-background p-4 overflow-hidden">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-1">My Bookings</h2>
        <p className="text-muted-foreground">Upcoming appointments</p>
      </div>

      <div className="space-y-4">
        {[
          { barber: 'Elite Cuts', service: 'Haircut', date: 'Tomorrow', time: '14:00', status: 'confirmed' },
          { barber: 'Urban Style', service: 'Full Package', date: 'Jan 20', time: '10:30', status: 'pending' },
        ].map((booking, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{booking.barber}</h3>
                  <p className="text-sm text-muted-foreground">{booking.service}</p>
                </div>
                <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                  {booking.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{booking.date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{booking.time}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <h3 className="font-semibold text-foreground mb-3">Past Bookings</h3>
        <Card className="opacity-75">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Classic Barber</h3>
                <p className="text-sm text-muted-foreground">Haircut • Jan 5</p>
              </div>
              <Button size="sm" variant="outline">
                Book Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BarberProfileScreenshot() {
  return (
    <div className="w-full h-full bg-background overflow-hidden">
      <div className="h-48 bg-gradient-to-br from-primary/30 to-muted flex items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center border-4 border-background shadow-lg">
          <Scissors className="w-10 h-10 text-primary" />
        </div>
      </div>
      
      <div className="p-4 -mt-8">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-foreground">Elite Cuts</h2>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
            <span className="font-semibold">4.9</span>
            <span className="text-muted-foreground">(127 reviews)</span>
          </div>
          <div className="flex items-center justify-center gap-1 mt-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>Bahnhofstrasse 42, Zürich</span>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <Button className="flex-1">Book Now</Button>
          <Button variant="outline" size="icon">
            <Heart className="w-5 h-5" />
          </Button>
        </div>

        <h3 className="font-semibold text-foreground mb-3">Services</h3>
        <div className="space-y-2">
          {MOCK_SERVICES.map((service, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="font-medium text-foreground">{service.name}</p>
                <p className="text-sm text-muted-foreground">{service.duration} min</p>
              </div>
              <p className="font-semibold text-foreground">CHF {service.price}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const SCREENSHOT_COMPONENTS = [
  { id: 'hero', name: 'Home / Hero', component: HeroScreenshot },
  { id: 'discovery', name: 'Barber Discovery', component: DiscoveryScreenshot },
  { id: 'profile', name: 'Barber Profile', component: BarberProfileScreenshot },
  { id: 'booking', name: 'Booking Flow', component: BookingScreenshot },
  { id: 'bookings', name: 'My Bookings', component: BookingsListScreenshot },
  { id: 'loyalty', name: 'Loyalty Rewards', component: LoyaltyScreenshot },
];

export default function ScreenshotMockups() {
  const { t } = useTranslation();
  const [selectedScreen, setSelectedScreen] = useState('hero');
  const [deviceType, setDeviceType] = useState<'phone' | 'tablet'>('phone');

  const SelectedComponent = SCREENSHOT_COMPONENTS.find(s => s.id === selectedScreen)?.component || HeroScreenshot;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">App Store Screenshot Mockups</h1>
          <p className="text-muted-foreground">
            Generate screenshots for iOS App Store and Google Play Store submissions
          </p>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-8">
          {/* Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Screen Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {SCREENSHOT_COMPONENTS.map((screen) => (
                  <Button
                    key={screen.id}
                    variant={selectedScreen === screen.id ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedScreen(screen.id)}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {screen.name}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Device Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant={deviceType === 'phone' ? 'default' : 'outline'}
                    onClick={() => setDeviceType('phone')}
                    className="flex-1"
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    Phone
                  </Button>
                  <Button
                    variant={deviceType === 'tablet' ? 'default' : 'outline'}
                    onClick={() => setDeviceType('tablet')}
                    className="flex-1"
                  >
                    <Tablet className="w-4 h-4 mr-2" />
                    Tablet
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Screenshot Specs</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="ios">
                  <TabsList className="w-full">
                    <TabsTrigger value="ios" className="flex-1">iOS</TabsTrigger>
                    <TabsTrigger value="android" className="flex-1">Android</TabsTrigger>
                  </TabsList>
                  <TabsContent value="ios" className="mt-4 space-y-2">
                    {SCREENSHOT_SPECS.ios.map((spec) => (
                      <div key={spec.name} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{spec.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{spec.width}x{spec.height}</span>
                          {spec.required && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="android" className="mt-4 space-y-2">
                    {SCREENSHOT_SPECS.android.map((spec) => (
                      <div key={spec.name} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{spec.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{spec.width}x{spec.height}</span>
                          {spec.required && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="flex justify-center">
            <div
              className={`
                relative bg-foreground rounded-[3rem] p-3 shadow-2xl
                ${deviceType === 'phone' ? 'w-[320px]' : 'w-[500px]'}
              `}
            >
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-foreground rounded-b-2xl z-10" />
              
              {/* Screen */}
              <div
                className={`
                  relative bg-background rounded-[2.5rem] overflow-hidden
                  ${deviceType === 'phone' ? 'h-[640px]' : 'h-[700px]'}
                `}
              >
                <div className="h-8" /> {/* Status bar space */}
                <div className="h-[calc(100%-32px)] overflow-hidden">
                  <SelectedComponent />
                </div>
              </div>

              {/* Home indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold text-foreground mb-2">📸 How to capture screenshots</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Select the screen you want to capture from the left panel</li>
            <li>Use browser dev tools to set the exact resolution (e.g., 1290x2796 for iPhone 6.7")</li>
            <li>Take a screenshot using browser capture or external tools</li>
            <li>Repeat for all required device sizes</li>
            <li>Add promotional text overlays as needed using design tools</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
