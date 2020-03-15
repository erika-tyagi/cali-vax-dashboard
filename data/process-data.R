rm(list = ls())

library(tidyverse)
library(ggmap)
library(rgdal)
library(geojsonio)

# register_google(key = "AIzaSyCqY3IkjLwV9PovPwhr38S1zFIiidfQNyQ")
# 
# # read raw data 
# raw_data <- read.csv("iz_kindergarten2016-17_to_2018-19_school_year.csv") %>% 
#     filter(CATEGORY == "MMR", 
#            SCHOOL_YEAR == "2018-2019") %>% 
#     select(SCHOOL_CODE, COUNTY, PUBLIC_PRIVATE, PUBLIC_SCHOOL_DISTRICT, CITY, SCHOOL_NAME, ENROLLMENT, PERCENT) 
# 
# # geocode schools 
# geocoded_data <- raw_data %>% 
#     mutate(lookup_address = paste(SCHOOL_NAME, CITY, ", CA")) %>% 
#     mutate_geocode(lookup_address)

geocoded_data <- read.csv('geocoded-data.csv') %>% 
    select(SCHOOL_NAME, PUBLIC_PRIVATE, CITY, SCHOOL_CODE, ENROLLMENT, PERCENT, lat, lon) %>% 
    arrange(desc(PERCENT)) %>% 
    drop_na() 

geojson_write(geocoded_data, lat = 'lat', lon = 'lon', file = 'ca-schools.geojson')


hist_data <- geocoded_data %>% 
    group_by(PERCENT) %>% 
    summarise(count = n())

write.csv(hist_data, 'ca-hist.csv', row.names = FALSE)


library(tidyverse)

setwd("~/Dropbox/winter-2020/data-viz/erika-tyagi.github.io/cali-vax-trends/data")

caSchools <- read.csv('geocoded_data.csv') %>% 
    mutate(group = case_when(PERCENT < 50 ~ 1, 
                             PERCENT >= 50 & PERCENT < 80 ~ 2, 
                             PERCENT >= 80 & PERCENT < 95 ~ 3, 
                             PERCENT >= 95 ~ 4)) 

ggplot(data = caSchools) + 
    geom_histogram(aes(x = PERCENT, 
                       fill = as.factor(group)), 
                   bins = 100) + 
    scale_x_continuous(breaks = seq(0, 100, 10), lim = c(0, 100)) + 
    scale_fill_manual(values = c("#1696d2", "#55b748", "#e88e2d", "#6e1614")) +
    scale_y_log10() + 
    coord_flip() + 
    theme_minimal() + 
    theme(legend.position = "none") + 
    labs(y = "", x = "") 


caSchools %>% 
    filter(group == 4) %>% 
    summarise(min = min(PERCENT), 
              max = max(PERCENT))
