import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { ptBR } from "date-fns/locale"
import { format, setYear, setMonth, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"

type NavigationView = 'day' | 'month' | 'year'

interface HierarchicalCalendarProps {
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  className?: string
  disabled?: (date: Date) => boolean
  minDate?: Date
  maxDate?: Date
}

function HierarchicalCalendar({
  selected,
  onSelect,
  className,
  disabled,
  minDate,
  maxDate,
  ...props
}: HierarchicalCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(selected || new Date())
  const [view, setView] = React.useState<NavigationView>('day')

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  // Gerar anos (5 anos para trás e 5 para frente)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

  const handleYearSelect = (year: number) => {
    setCurrentDate(setYear(currentDate, year))
    setView('month')
  }

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentDate(setMonth(currentDate, monthIndex))
    setView('day')
  }

  const handleDaySelect = (day: Date) => {
    if (disabled && disabled(day)) return
    onSelect?.(day)
  }

  const handlePrevious = () => {
    if (view === 'day') {
      setCurrentDate(setMonth(currentDate, currentDate.getMonth() - 1))
    } else if (view === 'month') {
      setCurrentDate(setYear(currentDate, currentDate.getFullYear() - 1))
    } else if (view === 'year') {
      // Para anos, podemos navegar por década
      setCurrentDate(setYear(currentDate, currentDate.getFullYear() - 10))
    }
  }

  const handleNext = () => {
    if (view === 'day') {
      setCurrentDate(setMonth(currentDate, currentDate.getMonth() + 1))
    } else if (view === 'month') {
      setCurrentDate(setYear(currentDate, currentDate.getFullYear() + 1))
    } else if (view === 'year') {
      // Para anos, podemos navegar por década
      setCurrentDate(setYear(currentDate, currentDate.getFullYear() + 10))
    }
  }

  const renderYearView = () => (
    <div className="p-3">
      <div className="flex justify-center items-center mb-4">
        <Button variant="ghost" size="sm" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold mx-4">
          {years[0]} - {years[years.length - 1]}
        </h2>
        <Button variant="ghost" size="sm" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {years.map((year) => (
          <Button
            key={year}
            variant="ghost"
            className={cn(
              "h-12 text-sm",
              year === currentDate.getFullYear() && "bg-primary text-primary-foreground"
            )}
            onClick={() => handleYearSelect(year)}
          >
            {year}
          </Button>
        ))}
      </div>
    </div>
  )

  const renderMonthView = () => (
    <div className="p-3">
      <div className="flex justify-center items-center mb-4">
        <Button variant="ghost" size="sm" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          className="text-lg font-semibold mx-4"
          onClick={() => setView('year')}
        >
          {currentDate.getFullYear()}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {monthNames.map((month, index) => (
          <Button
            key={month}
            variant="ghost"
            className={cn(
              "h-12 text-sm",
              index === currentDate.getMonth() && "bg-primary text-primary-foreground"
            )}
            onClick={() => handleMonthSelect(index)}
          >
            {month}
          </Button>
        ))}
      </div>
    </div>
  )

  const renderDayView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

    // Calcular os dias vazios no início
    const firstDayOfWeek = monthStart.getDay()
    const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i)

    return (
      <div className="p-3">
        <div className="flex justify-center items-center mb-4">
          <Button variant="ghost" size="sm" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="text-lg font-semibold mx-4"
            onClick={() => setView('month')}
          >
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 mb-2">
          {weekdays.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}
        </div>

        {/* Grade de dias */}
        <div className="grid grid-cols-7 gap-1">
          {/* Dias vazios no início */}
          {emptyDays.map((_, index) => (
            <div key={`empty-${index}`} className="h-9" />
          ))}
          
          {/* Dias do mês */}
          {days.map((day) => {
            const isSelectedDay = selected && isSameDay(day, selected)
            const isTodayDay = isToday(day)
            const isDisabled = disabled && disabled(day)

            return (
              <Button
                key={day.toISOString()}
                variant="ghost"
                className={cn(
                  "h-9 w-9 p-0 font-normal",
                  isSelectedDay && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  isTodayDay && !isSelectedDay && "bg-accent text-accent-foreground",
                  isDisabled && "text-muted-foreground opacity-50 cursor-not-allowed"
                )}
                onClick={() => !isDisabled && handleDaySelect(day)}
                disabled={isDisabled}
              >
                {day.getDate()}
              </Button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("rounded-md border", className)}>
      {view === 'year' && renderYearView()}
      {view === 'month' && renderMonthView()}
      {view === 'day' && renderDayView()}
    </div>
  )
}

// Usar calendário hierárquico como padrão
export type CalendarProps = HierarchicalCalendarProps

function Calendar(props: CalendarProps) {
  return <HierarchicalCalendar {...props} />
}
Calendar.displayName = "Calendar"

export { Calendar, HierarchicalCalendar }
